/**
 * Check customer linkage in detail
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function check() {
  console.log("Checking all customers and their user_id linkages:\n");
  
  const { data: customers, error } = await supabaseAdmin
    .from("customers")
    .select("id, business_name, telegram_id, user_id, email");
  
  if (error) {
    console.log("Error fetching customers:", error);
    return;
  }
  
  console.log(`Found ${customers.length} customers:\n`);
  
  for (const c of customers) {
    console.log(`Customer: ${c.business_name}`);
    console.log(`  - ID: ${c.id}`);
    console.log(`  - Email: ${c.email || "(not set)"}`);
    console.log(`  - Telegram ID: ${c.telegram_id || "(not set)"}`);
    console.log(`  - User ID (auth link): ${c.user_id || "(not set)"}`);
    console.log("");
  }
  
  // Check for Juss specifically
  console.log("\n--- Checking Juss's user_id linkage ---");
  const jussAuthId = "55b03ae0-2dce-4cfe-a234-4ee8efc7e0d8";
  
  const { data: jussCustomer, error: jussError } = await supabaseAdmin
    .from("customers")
    .select("*")
    .eq("user_id", jussAuthId);
  
  console.log(`Query: customers WHERE user_id = '${jussAuthId}'`);
  console.log(`Result:`, jussError ? jussError : jussCustomer);
  
  // Check deliverables with client_id
  console.log("\n--- Checking Brand Blueprints ---");
  const { data: blueprints } = await supabaseAdmin
    .from("brand_blueprints")
    .select("id, client_id, business_name");
  
  console.log("Blueprints:", blueprints);
  
  // Check if the client_ids match customer IDs
  console.log("\n--- Cross-referencing ---");
  const jussCustomerId = "f9c02727-15f9-4df4-b990-3b9a1caf0339";
  const jocelynCustomerId = "c6779d03-4832-45b2-b168-f840dc21fd7d";
  
  for (const bp of blueprints || []) {
    console.log(`Blueprint ${bp.business_name}:`);
    console.log(`  - client_id: ${bp.client_id}`);
    console.log(`  - Matches Juss? ${bp.client_id === jussCustomerId}`);
    console.log(`  - Matches Jocelyn? ${bp.client_id === jocelynCustomerId}`);
  }
}

check().catch(console.error);
