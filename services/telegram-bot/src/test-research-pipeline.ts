/**
 * Test Research Pipeline
 * 
 * Tests the new research-driven intelligence system with real API calls
 * to verify evidence-based output quality.
 */

import dotenv from "dotenv"
dotenv.config()

import { TavilyClient } from "./search/tavily-client.js"
import { ExaClient } from "./search/exa-client.js"
import { ResearchOrchestrator } from "./search/research-orchestrator.js"
import { competitorResearchAgent } from "./agents/competitor-research.js"
import { audienceResearchAgent } from "./agents/audience-research.js"
import { marketIntelligenceAgent } from "./agents/market-intelligence.js"
import type { PipelineContext } from "./types/pipeline.js"
import type { NormalizedIntakeData } from "./types/intake.js"

// Test data simulating a client intake
const TEST_INTAKE: NormalizedIntakeData = {
  businessName: "Artisan Coffee Roasters",
  businessType: "Specialty Coffee / Food & Beverage",
  website: "https://artisancoffeeroasters.example.com",
  socialHandles: {
    instagram: "@artisancoffeeroasters",
    tiktok: "@artisancoffee"
  },
  mission: "To bring ethically sourced, expertly roasted coffee to discerning consumers while supporting sustainable farming practices",
  vision: "To be the most trusted name in specialty coffee, known for quality, sustainability, and community impact",
  coreValues: ["Quality", "Sustainability", "Community", "Transparency", "Craftsmanship"],
  brandPersonality: ["Artisanal", "Passionate", "Authentic", "Knowledgeable", "Warm"],
  brandVoice: "Warm and inviting, educational without being pretentious, passionate about craft",
  uniqueValue: "Direct trade relationships with farmers combined with small-batch roasting for unparalleled freshness",
  avoidPerceptions: ["Mass-produced", "Corporate", "Pretentious"],
  brandStory: "Founded by two former baristas who traveled to origin countries and fell in love with the farmers and their craft",
  expertiseAreas: ["Coffee roasting", "Sustainable sourcing", "Brewing methods"],
  contentPillars: ["Behind the roast", "Coffee education", "Farmer stories", "Brewing tips"],
  contentFormats: ["Short video", "Reels", "Stories", "Carousels"],
  postingFrequency: "Daily",
  primaryPlatform: "Instagram",
  contentGoals: ["Build brand awareness", "Educate audience about coffee", "Drive online sales"],
  competitorInspiration: ["Blue Bottle Coffee", "Stumptown Coffee", "Counter Culture Coffee"],
  audienceAge: "Coffee enthusiasts aged 25-45 who value quality over convenience",
  audiencePainPoints: ["Finding quality coffee", "Understanding brewing methods", "Sustainability concerns"],
  audienceDesires: ["Premium coffee experience", "Learning about origins", "Supporting ethical sourcing"],
  audienceObjections: ["Price premium", "Time to brew properly"],
  audiencePlatforms: ["instagram", "tiktok", "youtube"],
  audienceSegments: ["Coffee connoisseurs", "Home brewers", "Sustainability-focused consumers"],
  callToAction: "Shop our latest roast",
  topicsToTrack: ["Coffee trends", "Sustainability in coffee", "Brewing innovations"],
  contentConsumption: "Short-form video, educational content, behind-the-scenes",
  thoughtLeaders: ["James Hoffmann", "Scott Rao"],
  contentToCreate: ["Brewing tutorials", "Origin stories", "Roast profiles"],
  topicsToAvoid: ["Instant coffee", "Mass market brands"],
  additionalContext: null
}

// Extended test data with additional fields for testing
const TEST_INDUSTRY = "specialty coffee"
const TEST_PLATFORMS = ["instagram", "tiktok", "youtube"]
const TEST_COMPETITORS = ["Blue Bottle Coffee", "Stumptown Coffee", "Counter Culture Coffee"]

// Mock pipeline context for agents
const createMockContext = (): PipelineContext => ({
  runId: "test-run-" + Date.now(),
  tenantId: "test-tenant-" + Date.now(),
  telegramId: 12345,
  telegramChatId: 12345,
  tenant: {
    id: "test-tenant",
    telegramId: 12345,
    telegramUsername: "test",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as any,
  intakeAnswers: [],
  normalizedIntake: TEST_INTAKE,
  researchContext: null,
  brandBlueprint: null,
  contentStrategy: null,
  audienceAnalysis: null,
  reviews: [],
  currentStage: "research",
  stagesCompleted: [],
  errors: [],
  startedAt: new Date(),
  lastActivityAt: new Date()
})

async function testTavilyClient() {
  console.log("\n" + "=".repeat(60))
  console.log("TEST 1: Tavily Search Client")
  console.log("=".repeat(60))
  
  const client = new TavilyClient()
  
  if (!process.env.TAVILY_API_KEY) {
    console.log("⚠️  TAVILY_API_KEY not set - skipping")
    return false
  }
  
  try {
    const result = await client.search("specialty coffee industry trends 2025", { maxResults: 3 })
    
    console.log(`Query: "${result.query}"`)
    console.log(`Results: ${result.results.length}`)
    console.log(`Search time: ${result.searchTime}ms`)
    console.log(`Provider: ${result.provider}`)
    
    if (result.error) {
      console.log(`Error: ${result.error}`)
      return false
    }
    
    for (const r of result.results.slice(0, 3)) {
      console.log(`\n  📄 ${r.title}`)
      console.log(`     ${r.url}`)
      console.log(`     Score: ${r.score.toFixed(2)}`)
      console.log(`     ${r.snippet.slice(0, 100)}...`)
    }
    
    if (result.answer) {
      console.log(`\n  📝 AI Answer: ${result.answer.slice(0, 200)}...`)
    }
    
    console.log("\n✅ Tavily client test PASSED")
    return true
  } catch (error) {
    console.error("❌ Tavily client test FAILED:", (error as Error).message)
    return false
  }
}

async function testExaClient() {
  console.log("\n" + "=".repeat(60))
  console.log("TEST 2: Exa Search Client")
  console.log("=".repeat(60))
  
  const client = new ExaClient()
  
  if (!process.env.EXA_API_KEY) {
    console.log("⚠️  EXA_API_KEY not set - skipping")
    return false
  }
  
  try {
    const result = await client.search("Blue Bottle Coffee company overview", { maxResults: 3 })
    
    console.log(`Query: "${result.query}"`)
    console.log(`Results: ${result.results.length}`)
    console.log(`Search time: ${result.searchTime}ms`)
    console.log(`Provider: ${result.provider}`)
    
    if (result.error) {
      console.log(`Error: ${result.error}`)
      return false
    }
    
    for (const r of result.results.slice(0, 3)) {
      console.log(`\n  📄 ${r.title}`)
      console.log(`     ${r.url}`)
      console.log(`     Score: ${r.score.toFixed(2)}`)
    }
    
    console.log("\n✅ Exa client test PASSED")
    return true
  } catch (error) {
    console.error("❌ Exa client test FAILED:", (error as Error).message)
    return false
  }
}

async function testCompetitorResearch() {
  console.log("\n" + "=".repeat(60))
  console.log("TEST 3: Competitor Research Agent")
  console.log("=".repeat(60))
  
  if (!process.env.TAVILY_API_KEY) {
    console.log("⚠️  TAVILY_API_KEY not set - skipping")
    return false
  }
  
  const context = createMockContext()
  
  try {
    console.log("Running competitor research for specialty coffee industry...")
    console.log(`Competitors: ${TEST_COMPETITORS.join(", ")}`)
    
    const result = await competitorResearchAgent.run(context, {
      intakeData: TEST_INTAKE,
      competitors: TEST_COMPETITORS,
      industry: TEST_INDUSTRY
    })
    
    if (!result.success || !result.data) {
      console.log("❌ Agent returned failure")
      return false
    }
    
    const data = result.data
    
    console.log(`\nCompetitors Analyzed: ${data.competitors.length}`)
    
    for (const competitor of data.competitors) {
      console.log(`\n  🏢 ${competitor.name}`)
      console.log(`     Website: ${competitor.website || "Not found"}`)
      console.log(`     Positioning: ${competitor.positioning.slice(0, 100)}...`)
      console.log(`     Strengths: ${competitor.strengths.length}`)
      console.log(`     Evidence sources: ${competitor.evidenceBundle.sources.length}`)
      console.log(`     Confidence: ${competitor.evidenceBundle.aggregateConfidence}`)
    }
    
    console.log(`\nDifferentiation Opportunities: ${data.differentiationOpportunities.length}`)
    for (const opp of data.differentiationOpportunities.slice(0, 3)) {
      console.log(`  • ${opp}`)
    }
    
    console.log(`\nTotal Evidence Bundles: ${data.evidenceBundles.length}`)
    console.log(`Research Gaps: ${data.researchGaps.length}`)
    console.log(`Methodology: ${data.methodology.totalQueries} queries, ${data.methodology.totalSources} sources`)
    
    console.log("\n✅ Competitor research test PASSED")
    return true
  } catch (error) {
    console.error("❌ Competitor research test FAILED:", (error as Error).message)
    return false
  }
}

async function testAudienceResearch() {
  console.log("\n" + "=".repeat(60))
  console.log("TEST 4: Audience Research Agent")
  console.log("=".repeat(60))
  
  if (!process.env.TAVILY_API_KEY) {
    console.log("⚠️  TAVILY_API_KEY not set - skipping")
    return false
  }
  
  const context = createMockContext()
  
  try {
    console.log("Running audience research...")
    console.log(`Target: ${TEST_INTAKE.audienceAge}`)
    console.log(`Platforms: ${TEST_PLATFORMS.join(", ")}`)
    
    const result = await audienceResearchAgent.run(context, {
      intakeData: TEST_INTAKE,
      industry: TEST_INDUSTRY,
      platforms: TEST_PLATFORMS,
      audienceDescription: TEST_INTAKE.audienceAge || undefined
    })
    
    if (!result.success || !result.data) {
      console.log("❌ Agent returned failure")
      return false
    }
    
    const data = result.data
    
    console.log("\n📊 Demographics:")
    console.log(`  Age: ${data.demographics.ageRange}`)
    console.log(`  Gender: ${data.demographics.gender}`)
    console.log(`  Locations: ${data.demographics.locations.join(", ")}`)
    console.log(`  Income: ${data.demographics.income || "Not found"}`)
    
    console.log("\n🧠 Psychographics:")
    console.log(`  Values: ${data.psychographics.values.length}`)
    console.log(`  Aspirations: ${data.psychographics.aspirations.length}`)
    console.log(`  Fears: ${data.psychographics.fears.length}`)
    
    console.log("\n📱 Platform Behavior:")
    for (const platform of data.platformBehavior) {
      console.log(`  ${platform.platform}:`)
      console.log(`    Best times: ${platform.engagementTimes.join(", ")}`)
      console.log(`    Content prefs: ${platform.contentPreferences.slice(0, 3).join(", ")}`)
    }
    
    console.log("\n😟 Pain Points:")
    for (const pp of data.painPoints.slice(0, 3)) {
      console.log(`  [${pp.severity.toUpperCase()}] ${pp.point.slice(0, 60)}...`)
    }
    
    console.log(`\nContent Preferences: ${data.contentPreferences.length}`)
    console.log(`Total Evidence Bundles: ${data.evidenceBundles.length}`)
    console.log(`Research Gaps: ${data.researchGaps.length}`)
    
    console.log("\n✅ Audience research test PASSED")
    return true
  } catch (error) {
    console.error("❌ Audience research test FAILED:", (error as Error).message)
    return false
  }
}

async function testMarketIntelligence() {
  console.log("\n" + "=".repeat(60))
  console.log("TEST 5: Market Intelligence Agent")
  console.log("=".repeat(60))
  
  if (!process.env.TAVILY_API_KEY) {
    console.log("⚠️  TAVILY_API_KEY not set - skipping")
    return false
  }
  
  const context = createMockContext()
  
  try {
    console.log("Running market intelligence research...")
    console.log(`Industry: ${TEST_INDUSTRY}`)
    
    const result = await marketIntelligenceAgent.run(context, {
      intakeData: TEST_INTAKE,
      industry: TEST_INDUSTRY
    })
    
    if (!result.success || !result.data) {
      console.log("❌ Agent returned failure")
      return false
    }
    
    const data = result.data
    
    console.log("\n📈 Industry Overview:")
    console.log(`  ${data.industryOverview.slice(0, 200)}...`)
    
    if (data.marketSize) {
      console.log(`\n💰 Market Size: ${data.marketSize.value} (${data.marketSize.source})`)
    }
    
    if (data.growthRate) {
      console.log(`📊 Growth Rate: ${data.growthRate.value} (${data.growthRate.source})`)
    }
    
    console.log("\n🔥 Key Trends:")
    for (const trend of data.keyTrends.slice(0, 3)) {
      console.log(`  [${trend.impact.toUpperCase()}] ${trend.trend}`)
      console.log(`    ${trend.description.slice(0, 80)}...`)
    }
    
    console.log("\n📱 Content Trends:")
    for (const ct of data.contentTrends.slice(0, 3)) {
      console.log(`  ${ct.platform}: ${ct.trend}`)
    }
    
    console.log(`\n🚀 Opportunities: ${data.emergingOpportunities.length}`)
    console.log(`⚠️  Threats: ${data.potentialThreats.length}`)
    console.log(`💡 Recommendations: ${data.recommendations.length}`)
    
    console.log(`\nTotal Evidence Bundles: ${data.evidenceBundles.length}`)
    console.log(`Research Gaps: ${data.researchGaps.length}`)
    
    console.log("\n✅ Market intelligence test PASSED")
    return true
  } catch (error) {
    console.error("❌ Market intelligence test FAILED:", (error as Error).message)
    return false
  }
}

async function main() {
  console.log("=" .repeat(60))
  console.log("KORA Research Pipeline Integration Test")
  console.log("=" .repeat(60))
  console.log("")
  console.log("Test Business: " + TEST_INTAKE.businessName)
  console.log("Industry: " + TEST_INDUSTRY)
  console.log("")
  
  const results: Record<string, boolean> = {}
  
  // Run tests
  results.tavily = await testTavilyClient()
  results.exa = await testExaClient()
  results.competitor = await testCompetitorResearch()
  results.audience = await testAudienceResearch()
  results.market = await testMarketIntelligence()
  
  // Summary
  console.log("\n" + "=".repeat(60))
  console.log("TEST SUMMARY")
  console.log("=".repeat(60))
  
  const passed = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length
  
  for (const [name, result] of Object.entries(results)) {
    console.log(`  ${result ? "✅" : "❌"} ${name}`)
  }
  
  console.log(`\n${passed}/${total} tests passed`)
  
  if (passed === total) {
    console.log("\n🎉 All tests passed! Research pipeline is working correctly.")
  } else if (passed > 0) {
    console.log("\n⚠️  Some tests passed. Check API keys for failed tests.")
  } else {
    console.log("\n❌ All tests failed. Ensure TAVILY_API_KEY is set.")
  }
}

main().catch(console.error)
