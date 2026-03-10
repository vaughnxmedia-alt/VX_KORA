/**
 * Verify and Fix Account Linkage Script
 * 
 * This script:
 * 1. Lists all customers with telegram_id
 * 2. Lists all auth users
 * 3. Shows which accounts are linked vs unlinked
 * 4. Links accounts by email match
 * 5. Shows deliverables status
 */

import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Target accounts to verify
const TARGET_ACCOUNTS = [
  {
    name: "Juss",
    telegramId: 8216104620,
    email: "justicevaughn7@gmail.com"
  },
  {
    name: "Jocelyn",
    telegramId: 8697293004,
    email: "jocelyncavinessbrigman@gmail.com"
  }
]

async function main() {
  console.log("=".repeat(80))
  console.log("ACCOUNT LINKAGE VERIFICATION AND FIX")
  console.log("=".repeat(80))
  
  // 1. Get all auth users
  console.log("\n📋 AUTH USERS:")
  const { data: authData } = await supabase.auth.admin.listUsers()
  const authUsers = authData?.users || []
  
  for (const user of authUsers) {
    console.log(`  - ${user.email} (ID: ${user.id.substring(0, 8)}...)`)
  }
  
  // 2. Get all customers
  console.log("\n📋 CUSTOMERS:")
  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, user_id, business_name, email, telegram_id")
  
  if (customersError) {
    console.error("Error fetching customers:", customersError)
    return
  }
  
  for (const customer of customers || []) {
    const linkedStatus = customer.user_id ? "✅ Linked" : "❌ Unlinked"
    const telegramStatus = customer.telegram_id ? `TG: ${customer.telegram_id}` : "No TG"
    console.log(`  - ${customer.business_name || "N/A"} | ${customer.email || "no email"} | ${linkedStatus} | ${telegramStatus}`)
    if (customer.user_id) {
      console.log(`    └─ user_id: ${customer.user_id.substring(0, 8)}...`)
    }
  }
  
  // 3. Check and fix target accounts
  console.log("\n" + "=".repeat(80))
  console.log("TARGET ACCOUNT STATUS:")
  console.log("=".repeat(80))
  
  for (const target of TARGET_ACCOUNTS) {
    console.log(`\n👤 ${target.name}:`)
    console.log(`   Email: ${target.email}`)
    console.log(`   Telegram ID: ${target.telegramId}`)
    
    // Find auth user
    const authUser = authUsers.find(u => u.email?.toLowerCase() === target.email.toLowerCase())
    if (authUser) {
      console.log(`   ✅ Auth user found: ${authUser.id.substring(0, 8)}...`)
    } else {
      console.log(`   ❌ No auth user found for this email`)
    }
    
    // Find customer by telegram_id
    const customerByTelegram = customers?.find(c => c.telegram_id === target.telegramId)
    if (customerByTelegram) {
      console.log(`   ✅ Customer found by telegram_id: ${customerByTelegram.id}`)
      
      if (!customerByTelegram.user_id && authUser) {
        console.log(`   🔧 FIXING: Linking customer to auth user...`)
        
        const { error: linkError } = await supabase
          .from("customers")
          .update({ 
            user_id: authUser.id,
            email: target.email
          })
          .eq("id", customerByTelegram.id)
        
        if (linkError) {
          console.log(`   ❌ Link failed: ${linkError.message}`)
        } else {
          console.log(`   ✅ Customer linked to auth user!`)
        }
      } else if (customerByTelegram.user_id) {
        console.log(`   ✅ Customer already linked to user_id: ${customerByTelegram.user_id.substring(0, 8)}...`)
      }
    } else {
      console.log(`   ❌ No customer found with telegram_id ${target.telegramId}`)
      
      // Try to find customer by email
      const customerByEmail = customers?.find(c => c.email?.toLowerCase() === target.email.toLowerCase())
      if (customerByEmail) {
        console.log(`   📝 Customer found by email: ${customerByEmail.id}`)
        console.log(`   🔧 FIXING: Updating telegram_id...`)
        
        const updateData: any = { telegram_id: target.telegramId }
        if (authUser && !customerByEmail.user_id) {
          updateData.user_id = authUser.id
        }
        
        const { error: updateError } = await supabase
          .from("customers")
          .update(updateData)
          .eq("id", customerByEmail.id)
        
        if (updateError) {
          console.log(`   ❌ Update failed: ${updateError.message}`)
        } else {
          console.log(`   ✅ Customer updated with telegram_id!`)
        }
      } else if (authUser) {
        // Check if customer exists by user_id
        const customerByUserId = customers?.find(c => c.user_id === authUser.id)
        if (customerByUserId) {
          console.log(`   📝 Customer found by user_id: ${customerByUserId.id}`)
          console.log(`   🔧 FIXING: Updating telegram_id...`)
          
          const { error: updateError } = await supabase
            .from("customers")
            .update({ 
              telegram_id: target.telegramId,
              email: target.email
            })
            .eq("id", customerByUserId.id)
          
          if (updateError) {
            console.log(`   ❌ Update failed: ${updateError.message}`)
          } else {
            console.log(`   ✅ Customer updated with telegram_id!`)
          }
        } else {
          // Create new customer
          console.log(`   🔧 CREATING: New customer record...`)
          
          const { data: newCustomer, error: createError } = await supabase
            .from("customers")
            .insert({
              user_id: authUser.id,
              telegram_id: target.telegramId,
              business_name: target.name,
              email: target.email
            })
            .select("id")
            .single()
          
          if (createError) {
            console.log(`   ❌ Create failed: ${createError.message}`)
          } else {
            console.log(`   ✅ New customer created: ${newCustomer.id}`)
          }
        }
      }
    }
  }
  
  // 4. Show deliverables for target accounts
  console.log("\n" + "=".repeat(80))
  console.log("DELIVERABLES STATUS:")
  console.log("=".repeat(80))
  
  for (const target of TARGET_ACCOUNTS) {
    console.log(`\n📦 ${target.name} (TG: ${target.telegramId}):`)
    
    // Brand Blueprint
    const { data: blueprints } = await supabase
      .from("brand_blueprints")
      .select("id, business_name, client_id, telegram_id, generated_at")
      .eq("telegram_id", target.telegramId)
    
    if (blueprints?.length) {
      for (const bp of blueprints) {
        console.log(`   📄 Brand Blueprint: ${bp.business_name}`)
        console.log(`      client_id: ${bp.client_id}`)
        console.log(`      generated: ${bp.generated_at}`)
      }
    } else {
      console.log(`   ❌ No Brand Blueprint found`)
    }
    
    // Content Strategy
    const { data: strategies } = await supabase
      .from("content_strategies")
      .select("id, client_id, telegram_id, generated_at")
      .eq("telegram_id", target.telegramId)
    
    if (strategies?.length) {
      console.log(`   📄 Content Strategy: ${strategies.length} found`)
      for (const s of strategies) {
        console.log(`      client_id: ${s.client_id}`)
        console.log(`      generated: ${s.generated_at}`)
      }
    } else {
      console.log(`   ❌ No Content Strategy found`)
    }
    
    // Audience Analysis
    const { data: analyses } = await supabase
      .from("audience_analyses")
      .select("id, client_id, telegram_id, generated_at")
      .eq("telegram_id", target.telegramId)
    
    if (analyses?.length) {
      console.log(`   📄 Audience Analysis: ${analyses.length} found`)
      for (const a of analyses) {
        console.log(`      client_id: ${a.client_id}`)
        console.log(`      generated: ${a.generated_at}`)
      }
    } else {
      console.log(`   ❌ No Audience Analysis found`)
    }
  }
  
  // 5. Re-fetch and show final customer state
  console.log("\n" + "=".repeat(80))
  console.log("FINAL CUSTOMER STATE AFTER FIXES:")
  console.log("=".repeat(80))
  
  const { data: finalCustomers } = await supabase
    .from("customers")
    .select("id, user_id, business_name, email, telegram_id")
    .in("telegram_id", TARGET_ACCOUNTS.map(t => t.telegramId))
  
  for (const customer of finalCustomers || []) {
    console.log(`\n✅ ${customer.business_name || "N/A"}:`)
    console.log(`   ID: ${customer.id}`)
    console.log(`   user_id: ${customer.user_id || "NOT LINKED"}`)
    console.log(`   email: ${customer.email || "N/A"}`)
    console.log(`   telegram_id: ${customer.telegram_id}`)
    
    if (!customer.user_id) {
      console.log(`   ⚠️  WARNING: This customer is not linked to an auth user!`)
      console.log(`      The user won't be able to see their data in the dashboard.`)
    }
  }
  
  console.log("\n" + "=".repeat(80))
  console.log("VERIFICATION COMPLETE")
  console.log("=".repeat(80))
  console.log("\nNext steps:")
  console.log("1. Run the new RLS migration: npx supabase db push")
  console.log("2. Ensure customers have user_id linked to see data in dashboard")
  console.log("3. Test by logging in as Juss or Jocelyn on the main site")
}

main().catch(console.error)
