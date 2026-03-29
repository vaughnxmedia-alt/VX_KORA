/**
 * Diagnose Data Access Issues
 * 
 * This script checks:
 * 1. If data exists in the deliverable tables
 * 2. If customers are properly linked to auth users
 * 3. If RLS policies might be blocking access
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client bypasses RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// We only need admin client for diagnosis
// const supabasePublicKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;
// const supabaseClient = createClient(supabaseUrl, supabasePublicKey);

// Target accounts
const TARGET_USERS = [
  { name: "Juss", email: "Justicevaughn7@gmail.com", telegramId: 8216104620 },
  { name: "Jocelyn", email: "jocelyncavinessbrigman@gmail.com", telegramId: 8697293004 }
];

async function diagnose() {
  console.log("=".repeat(70));
  console.log("KORA Data Access Diagnostic");
  console.log("=".repeat(70));
  console.log("");

  // 1. Check total data in tables (using service role)
  console.log("1. CHECKING DATA EXISTS (Service Role - bypasses RLS)");
  console.log("-".repeat(50));
  
  const tables = ["brand_blueprints", "content_strategies", "audience_analyses", "customers"];
  for (const table of tables) {
    const { count, error } = await supabaseAdmin
      .from(table)
      .select("*", { count: "exact", head: true });
    
    if (error) {
      console.log(`   ${table}: ERROR - ${error.message}`);
    } else {
      console.log(`   ${table}: ${count} rows`);
    }
  }
  console.log("");

  // 2. Check customers table for target users
  console.log("2. CHECKING CUSTOMER RECORDS");
  console.log("-".repeat(50));
  
  for (const user of TARGET_USERS) {
    const { data: customer, error } = await supabaseAdmin
      .from("customers")
      .select("id, business_name, telegram_id, user_id, email")
      .eq("telegram_id", user.telegramId)
      .single();
    
    if (error) {
      console.log(`   ${user.name}: NOT FOUND by telegram_id ${user.telegramId}`);
      
      // Try by email
      const { data: byEmail } = await supabaseAdmin
        .from("customers")
        .select("id, business_name, telegram_id, user_id, email")
        .eq("email", user.email)
        .single();
      
      if (byEmail) {
        console.log(`   ${user.name}: Found by email instead`);
        console.log(`     - ID: ${byEmail.id}`);
        console.log(`     - telegram_id: ${byEmail.telegram_id || "NOT SET"}`);
        console.log(`     - user_id: ${byEmail.user_id || "NOT SET"}`);
      }
    } else {
      console.log(`   ${user.name}:`);
      console.log(`     - Customer ID: ${customer.id}`);
      console.log(`     - Business: ${customer.business_name}`);
      console.log(`     - telegram_id: ${customer.telegram_id || "NOT SET"}`);
      console.log(`     - user_id: ${customer.user_id || "NOT LINKED"}`);
      console.log(`     - email: ${customer.email || "NOT SET"}`);
      
      // Check if user_id exists in auth.users
      if (customer.user_id) {
        const { data: authUser, error: authError } = await supabaseAdmin
          .auth.admin.getUserById(customer.user_id);
        
        if (authError || !authUser?.user) {
          console.log(`     - AUTH USER: NOT FOUND - This is a problem!`);
        } else {
          console.log(`     - AUTH USER: Found (${authUser.user.email})`);
        }
      }
      
      // Check deliverables for this customer
      const { count: bpCount } = await supabaseAdmin
        .from("brand_blueprints")
        .select("*", { count: "exact", head: true })
        .eq("client_id", customer.id);
      
      const { count: csCount } = await supabaseAdmin
        .from("content_strategies")
        .select("*", { count: "exact", head: true })
        .eq("client_id", customer.id);
      
      const { count: aaCount } = await supabaseAdmin
        .from("audience_analyses")
        .select("*", { count: "exact", head: true })
        .eq("client_id", customer.id);
      
      console.log(`     - Deliverables: ${bpCount} blueprints, ${csCount} strategies, ${aaCount} analyses`);
    }
    console.log("");
  }

  // 3. Check auth.users for the target emails
  console.log("3. CHECKING AUTH USERS");
  console.log("-".repeat(50));
  
  const { data: authUsers, error: authListError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (authListError) {
    console.log(`   Error listing users: ${authListError.message}`);
  } else {
    for (const user of TARGET_USERS) {
      const authUser = authUsers.users.find(
        u => u.email?.toLowerCase() === user.email.toLowerCase()
      );
      
      if (authUser) {
        console.log(`   ${user.name} (${user.email}):`);
        console.log(`     - Auth User ID: ${authUser.id}`);
        console.log(`     - Created: ${authUser.created_at}`);
        console.log(`     - Last sign in: ${authUser.last_sign_in_at || "Never"}`);
        
        // Check if this user_id is in any customer record
        const { data: linkedCustomer } = await supabaseAdmin
          .from("customers")
          .select("id, business_name")
          .eq("user_id", authUser.id)
          .single();
        
        if (linkedCustomer) {
          console.log(`     - Linked to customer: ${linkedCustomer.id} (${linkedCustomer.business_name})`);
        } else {
          console.log(`     - NOT LINKED TO ANY CUSTOMER - This is why data doesn't show!`);
        }
      } else {
        console.log(`   ${user.name} (${user.email}): NO AUTH ACCOUNT`);
      }
      console.log("");
    }
  }

  // 4. Check RLS policies (list them)
  console.log("4. CHECKING RLS POLICIES");
  console.log("-".repeat(50));
  
  const { data: policies, error: policiesError } = await supabaseAdmin
    .rpc("check_rls_policies");
  
  if (policiesError) {
    // This RPC doesn't exist, try raw query through pg_policies
    console.log("   (Cannot directly query policies - checking if RLS is enabled)");
    
    // Check if brand_blueprints has any policies by attempting a query
    // as an authenticated user (simulated)
    const { data: testBp, error: testError } = await supabaseAdmin
      .from("brand_blueprints")
      .select("id")
      .limit(1);
    
    console.log(`   brand_blueprints query (admin): ${testError ? "ERROR" : "OK"}`);
  }
  
  // 5. Summary and recommendations
  console.log("");
  console.log("=".repeat(70));
  console.log("DIAGNOSIS SUMMARY");
  console.log("=".repeat(70));
  console.log("");
  console.log("If users can't see data on the dashboard, check:");
  console.log("");
  console.log("1. Is the customer's 'user_id' linked to their auth.uid?");
  console.log("   - Dashboard queries use: auth.uid() -> customers.user_id -> client_id");
  console.log("   - If user_id is NULL, the join fails and no data shows");
  console.log("");
  console.log("2. Has the RLS migration been applied?");
  console.log("   - File: apps/web/supabase/migrations/20260307100000_fix_deliverables_rls.sql");
  console.log("   - Run: npx supabase db push");
  console.log("   - Or apply manually in Supabase Dashboard SQL Editor");
  console.log("");
  console.log("3. Do deliverables exist for the customer?");
  console.log("   - brand_blueprints, content_strategies, audience_analyses");
  console.log("   - client_id should match the customer's ID");
  console.log("");
}

diagnose().catch(console.error);
