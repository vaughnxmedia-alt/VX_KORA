/**
 * Check RLS policies on deliverable tables
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkRLS() {
  console.log("Checking RLS policies on deliverable tables...\n");
  
  // Query pg_policies to see what policies exist
  const { data: policies, error } = await supabaseAdmin.rpc("exec_sql", {
    sql: `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual
      FROM pg_policies
      WHERE tablename IN ('brand_blueprints', 'content_strategies', 'audience_analyses', 'customers')
      ORDER BY tablename, policyname;
    `
  });
  
  if (error) {
    console.log("Cannot query pg_policies directly. Trying alternative...\n");
    
    // Alternative: Try to get policies info via information_schema
    const { data: rlsEnabled, error: rlsError } = await supabaseAdmin.rpc("exec_sql", {
      sql: `
        SELECT 
          relname as table_name,
          relrowsecurity as rls_enabled
        FROM pg_class
        WHERE relname IN ('brand_blueprints', 'content_strategies', 'audience_analyses', 'customers')
          AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
      `
    });
    
    if (rlsError) {
      console.log("Cannot check RLS status via rpc. Error:", rlsError.message);
      console.log("\nTrying direct query approach...\n");
      
      // Last resort: Just describe the issue
      console.log("To check if RLS policies exist, run this SQL in Supabase SQL Editor:");
      console.log(`
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  LEFT(qual::text, 100) as policy_definition
FROM pg_policies
WHERE tablename IN ('brand_blueprints', 'content_strategies', 'audience_analyses')
ORDER BY tablename, policyname;
      `);
    } else {
      console.log("RLS status:", rlsEnabled);
    }
  } else {
    console.log("Policies found:", policies);
  }
  
  // Let's also check if we can query as an authenticated user
  console.log("\n--- Testing query patterns ---");
  
  // This simulates what the dashboard does
  const jussUserId = "55b03ae0-2dce-4cfe-a234-4ee8efc7e0d8";
  
  // Step 1: Get customer IDs for this user
  const { data: customerIds } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("user_id", jussUserId);
  
  console.log(`\nCustomer IDs for Juss's user_id:`, customerIds?.map(c => c.id));
  
  // Step 2: Get blueprints for those customer IDs
  if (customerIds && customerIds.length > 0) {
    const ids = customerIds.map(c => c.id);
    const { data: blueprints, error: bpError } = await supabaseAdmin
      .from("brand_blueprints")
      .select("id, business_name, client_id")
      .in("client_id", ids);
    
    console.log(`Blueprints found:`, blueprints);
    if (bpError) console.log(`Error:`, bpError);
  }
}

checkRLS().catch(console.error);
