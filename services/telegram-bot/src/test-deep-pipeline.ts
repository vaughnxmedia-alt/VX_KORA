/**
 * Test Deep Research Pipeline
 * 
 * Tests the full deep research pipeline with progress tracking for Juss and Jocelyn accounts.
 * This script simulates the complete flow from intake to delivery with real-time progress updates.
 */

import { createClient } from "@supabase/supabase-js";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Imports from the pipeline
import { DeepResearchOrchestrator, createDeepResearchOrchestrator } from "./pipeline/deep-research-orchestrator.js";
import { createProgressTracker, ProgressTracker } from "./pipeline/progress-tracker.js";
import type { PipelineContext } from "./types/pipeline.js";
import type { NormalizedIntakeData } from "./types/intake.js";
import type { TenantProfile } from "./types/research.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false });

// Target users for testing
const TARGET_USERS = [
  { 
    telegramId: 8216104620, 
    name: "Juss",
    email: "Justicevaughn7@gmail.com"
  },
  { 
    telegramId: 8697293004, 
    name: "Jocelyn",
    email: "jocelyncavinessbrigman@gmail.com"
  }
];

interface IntakeSession {
  id: string;
  telegram_id: number;
  telegram_username: string | null;
  responses: Record<string, string>;
  client_id: string | null;
}

interface Customer {
  id: string;
  telegram_id: number | null;
  user_id: string | null;
  business_name: string;
  email: string | null;
}

/**
 * Normalize intake data from session responses
 */
function normalizeIntakeData(responses: Record<string, string>): NormalizedIntakeData {
  return {
    businessName: responses.business_name || responses.brandName || "Unknown Business",
    businessType: responses.business_type || responses.industry || responses.niche || "General",
    website: responses.website_url || responses.website || null,
    yearFounded: responses.year_founded ? parseInt(responses.year_founded) : null,
    teamSize: responses.team_size || null,
    primaryGoals: responses.goals?.split(',').map(g => g.trim()) || [responses.goal || "Brand growth"],
    audienceAge: responses.audience_age || responses.target_audience || null,
    audiencePlatforms: responses.platforms?.split(',').map(p => p.trim()) || [],
    competitorInspiration: responses.competitors?.split(',').map(c => c.trim()) || [],
    uniqueValue: responses.unique_value || responses.uvp || null,
    brandPersonality: responses.personality?.split(',').map(p => p.trim()) || [],
    socialHandles: {
      instagram: responses.instagram || null,
      tiktok: responses.tiktok || null,
      linkedin: responses.linkedin || null,
      youtube: responses.youtube || null,
      twitter: responses.twitter || null,
    },
  };
}

/**
 * Get or create a mock pipeline context for testing
 */
async function createTestContext(
  customer: Customer,
  session: IntakeSession
): Promise<PipelineContext> {
  const normalizedIntake = normalizeIntakeData(session.responses);

  // Create a pipeline run in the database
  const { data: pipelineRun, error } = await supabase
    .from("intel_pipeline_runs")
    .insert({
      tenant_id: customer.id,
      run_type: "deep_research",
      trigger: "test_script",
      status: "running",
      current_stage: "research",
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating pipeline run:", error);
    throw error;
  }

  const tenant: TenantProfile = {
    id: customer.id,
    telegramId: customer.telegram_id || session.telegram_id,
    telegramUsername: session.telegram_username,
    businessName: normalizedIntake.businessName,
    pipelineStage: "research",
    intakeCompleted: true,
    lastActivityAt: new Date(),
    createdAt: new Date(),
  };

  return {
    runId: pipelineRun.id,
    tenantId: customer.id,
    telegramId: customer.telegram_id || session.telegram_id,
    telegramChatId: customer.telegram_id || session.telegram_id,
    tenant,
    intakeAnswers: [],
    normalizedIntake,
    researchContext: null,
    brandBlueprint: null,
    contentStrategy: null,
    audienceAnalysis: null,
    reviews: [],
    currentStage: "research",
    stagesCompleted: ["intake"],
    errors: [],
    startedAt: new Date(),
    lastActivityAt: new Date(),
  };
}

/**
 * Run the deep research pipeline for a single user
 */
async function runPipelineForUser(
  user: typeof TARGET_USERS[0]
): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Starting deep research pipeline for ${user.name}`);
  console.log(`Telegram ID: ${user.telegramId}`);
  console.log(`${"=".repeat(60)}\n`);

  // Get the customer record
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("*")
    .eq("telegram_id", user.telegramId)
    .single();

  if (customerError || !customer) {
    console.error(`Customer not found for ${user.name} (Telegram ID: ${user.telegramId})`);
    console.error("Error:", customerError);
    return;
  }

  console.log(`Found customer: ${customer.business_name} (ID: ${customer.id})`);

  // Get the latest intake session
  const { data: session, error: sessionError } = await supabase
    .from("telegram_intake_sessions")
    .select("*")
    .eq("telegram_id", user.telegramId)
    .eq("phase", "complete")
    .order("last_activity", { ascending: false })
    .limit(1)
    .single();

  if (sessionError || !session) {
    console.error(`No completed intake session found for ${user.name}`);
    console.error("Error:", sessionError);
    return;
  }

  console.log(`Found intake session: ${session.id}`);
  console.log(`Responses:`, JSON.stringify(session.responses, null, 2).slice(0, 500) + "...");

  try {
    // Create test context
    const context = await createTestContext(customer as Customer, session as IntakeSession);
    console.log(`\nCreated pipeline context (Run ID: ${context.runId})`);

    // Create the deep research orchestrator
    const orchestrator = createDeepResearchOrchestrator(bot, {
      maxQualityIterations: 2,
      minQualityScore: 0.7,
      enableCompetitorResearch: true,
      enableAudienceResearch: true,
      enableMarketIntelligence: true,
      maxCompetitors: 3,
    });

    console.log(`\nStarting deep research pipeline...`);
    console.log(`This may take 30-60 minutes. Check the dashboard for real-time progress.`);
    console.log(`Dashboard URL: Check your KORA dashboard for user ${user.name}`);
    console.log(`${"=".repeat(60)}\n`);

    // Run the pipeline
    await orchestrator.run(context);

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Pipeline completed successfully for ${user.name}!`);
    console.log(`${"=".repeat(60)}\n`);

  } catch (error) {
    console.error(`\nPipeline failed for ${user.name}:`, error);
    throw error;
  }
}

/**
 * Check the pipeline_progress table exists
 */
async function checkProgressTable(): Promise<boolean> {
  const { data, error } = await supabase
    .from("pipeline_progress")
    .select("id")
    .limit(1);

  if (error) {
    if (error.code === "42P01") {
      console.error("ERROR: pipeline_progress table does not exist.");
      console.error("Please run the migration first:");
      console.error("  npx supabase db push");
      console.error("Or apply the migration manually in the Supabase dashboard.");
      return false;
    }
    console.error("Error checking pipeline_progress table:", error);
    return false;
  }

  console.log("✓ pipeline_progress table exists");
  return true;
}

/**
 * Main test function
 */
async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("KORA Deep Research Pipeline Test");
  console.log("=".repeat(60));
  console.log("");

  // Check environment variables
  const requiredEnvVars = [
    "SUPABASE_URL",
    "TELEGRAM_BOT_TOKEN",
  ];

  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error("Missing SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  console.log("✓ Environment variables configured");

  // Check if pipeline_progress table exists
  const tableExists = await checkProgressTable();
  if (!tableExists) {
    console.log("\nCannot proceed without pipeline_progress table.");
    console.log("The test will continue but progress tracking will fail.");
    console.log("");
  }

  // Parse command line args
  const args = process.argv.slice(2);
  const userArg = args.find(a => a.startsWith("--user="));
  const selectedUser = userArg ? userArg.split("=")[1].toLowerCase() : null;

  // Filter users based on command line arg
  let usersToTest = TARGET_USERS;
  if (selectedUser) {
    usersToTest = TARGET_USERS.filter(u => u.name.toLowerCase() === selectedUser);
    if (usersToTest.length === 0) {
      console.error(`Unknown user: ${selectedUser}`);
      console.error(`Available users: ${TARGET_USERS.map(u => u.name).join(", ")}`);
      process.exit(1);
    }
  }

  console.log(`\nUsers to test: ${usersToTest.map(u => u.name).join(", ")}`);
  console.log("");

  // Run pipeline for each user
  for (const user of usersToTest) {
    try {
      await runPipelineForUser(user);
    } catch (error) {
      console.error(`Failed for ${user.name}:`, error);
      // Continue with next user
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Test complete!");
  console.log("=".repeat(60));
}

// Run the test
main().catch(console.error);
