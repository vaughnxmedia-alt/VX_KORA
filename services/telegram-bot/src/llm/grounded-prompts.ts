/**
 * KORA Grounded Prompts
 * 
 * Prompt templates that enforce evidence-based generation with mandatory
 * citations, confidence levels, and acknowledgment of research gaps.
 */

import type { EvidenceBundle, ResearchGap } from "../types/evidence.js"
import { formatEvidenceForPrompt, formatGapsForOutput } from "../types/evidence.js"

// ============================================================================
// CORE GROUNDING RULES
// ============================================================================

/**
 * Mandatory grounding rules that must be included in all generation prompts
 */
export const GROUNDING_RULES = `
## CRITICAL GROUNDING RULES

You MUST follow these rules to ensure output quality:

### 1. Citation Requirements
- Every factual claim MUST include a [Source N] citation referencing the research evidence
- If no source supports a claim, prefix with "Based on general industry practices:" 
- Cite specific sources: "According to [Source 1]..." or "Research shows [Source 2]..."
- Multiple sources strengthen claims: "Multiple sources confirm [Source 1, Source 3]..."

### 2. Confidence Levels
Mark each major section with a confidence indicator:
- ✓ HIGH (3+ corroborating sources) - Strong evidence backing
- ◐ MEDIUM (2 sources) - Reasonable evidence
- ○ LOW (1 source) - Limited evidence, treat as directional
- ? UNVERIFIED - No external sources, based on intake/general knowledge

### 3. Gap Acknowledgment
- Explicitly acknowledge when data is missing: "Unable to verify [X] from research"
- Suggest what additional data would strengthen weak sections
- Do not fabricate statistics, market sizes, or specific data points

### 4. Conflicting Evidence
- When sources disagree, note both positions
- State which position has stronger evidence
- Example: "While Source 1 suggests X, Source 2 indicates Y. The stronger evidence supports X because..."

### 5. Specificity Requirements
- Replace generic statements with specific, sourced insights
- BAD: "Your audience is active on social media"
- GOOD: "Based on industry research [Source 2], your target demographic spends 2.5 hours daily on Instagram and TikTok"

### 6. Avoid These Patterns
- ❌ "Studies show..." (which studies? cite them)
- ❌ "Research indicates..." (what research? cite it)
- ❌ "Statistics suggest..." (what statistics? cite the source)
- ❌ Fabricated percentages without source
- ❌ Generic statements that could apply to anyone
`.trim()

// ============================================================================
// BRAND BLUEPRINT GROUNDED PROMPT
// ============================================================================

export function buildGroundedBrandPrompt(
  intakeData: Record<string, string>,
  researchEvidence: EvidenceBundle[],
  researchGaps: ResearchGap[]
): string {
  return `
${GROUNDING_RULES}

---

## RESEARCH EVIDENCE PROVIDED

${formatEvidenceForPrompt(researchEvidence)}

## RESEARCH GAPS (Cannot be verified)

${researchGaps.length > 0 ? formatGapsForOutput(researchGaps).join("\n") : "No major gaps identified"}

---

## CLIENT INTAKE DATA

${Object.entries(intakeData).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

---

## YOUR TASK: Generate Brand Blueprint

Create a comprehensive Brand Identity Blueprint with the following sections.
For each section, include the confidence level and cite sources where applicable.

### Required Sections:

1. **Brand Essence** [Confidence: ?]
   - Core identity statement
   - Source: [cite if from research, or "Based on intake responses"]

2. **Mission Statement** [Confidence: ?]
   - Why the brand exists
   - Source: [cite]

3. **Vision Statement** [Confidence: ?]
   - Where the brand is going
   - Source: [cite]

4. **Core Values** [Confidence: ?]
   - 3-5 values with explanations
   - Each value should cite its source

5. **Brand Personality** [Confidence: ?]
   - Personality traits with descriptions
   - Source: [cite, especially if informed by competitor analysis]

6. **Unique Value Proposition** [Confidence: ?]
   - What makes this brand different
   - Source: [cite competitor research if applicable]

7. **Brand Voice** [Confidence: ?]
   - Tone, language style, communication principles
   - Source: [cite industry/platform research if applicable]

8. **Competitive Positioning** [Confidence: ?]
   - How the brand stands out from competitors
   - Source: [MUST cite competitor research]

### Output Format:
Provide a JSON object with this structure:
{
  "brandEssence": { "statement": "", "confidence": 0.0-1.0, "source": "" },
  "missionStatement": { "statement": "", "confidence": 0.0-1.0, "source": "" },
  "visionStatement": { "statement": "", "confidence": 0.0-1.0, "source": "" },
  "coreValues": [{ "value": "", "explanation": "", "confidence": 0.0-1.0, "source": "" }],
  "brandPersonality": [{ "trait": "", "description": "", "confidence": 0.0-1.0 }],
  "uniqueValueProposition": { "statement": "", "confidence": 0.0-1.0, "source": "" },
  "brandVoice": { "tone": "", "languageStyle": "", "principles": [], "confidence": 0.0-1.0 },
  "positioningStatement": { "statement": "", "confidence": 0.0-1.0 },
  "competitiveInsights": { "mainDifferentiators": [], "competitorWeaknesses": [], "evidenceIds": [] },
  "lowConfidenceSections": [],
  "researchGaps": [{ "section": "", "gapDescription": "" }]
}

Remember: Every claim must be backed by either intake data, research evidence, or explicitly marked as general knowledge.
`.trim()
}

// ============================================================================
// AUDIENCE ANALYSIS GROUNDED PROMPT
// ============================================================================

export function buildGroundedAudiencePrompt(
  intakeData: Record<string, string>,
  researchEvidence: EvidenceBundle[],
  researchGaps: ResearchGap[],
  audienceResearch?: {
    demographics?: Record<string, unknown>
    psychographics?: Record<string, unknown>
    platformBehavior?: Array<Record<string, unknown>>
    painPoints?: Array<Record<string, unknown>>
  }
): string {
  const audienceContext = audienceResearch ? `
## AUDIENCE RESEARCH DATA

### Demographics (from research)
${JSON.stringify(audienceResearch.demographics || {}, null, 2)}

### Psychographics (from research)
${JSON.stringify(audienceResearch.psychographics || {}, null, 2)}

### Platform Behavior (from research)
${JSON.stringify(audienceResearch.platformBehavior || [], null, 2)}

### Pain Points (from research)
${JSON.stringify(audienceResearch.painPoints || [], null, 2)}
` : ""

  return `
${GROUNDING_RULES}

---

## RESEARCH EVIDENCE PROVIDED

${formatEvidenceForPrompt(researchEvidence)}

${audienceContext}

## RESEARCH GAPS

${researchGaps.length > 0 ? formatGapsForOutput(researchGaps).join("\n") : "No major gaps"}

---

## CLIENT INTAKE DATA

${Object.entries(intakeData).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

---

## YOUR TASK: Generate Audience Analysis

Create a comprehensive Target Audience Analysis. Every demographic or psychographic claim
MUST be backed by research evidence or clearly marked as inferred from intake.

### Required Sections:

1. **Primary Audience Demographics** [Confidence: ?]
   - Age range: [cite source]
   - Gender: [cite source]
   - Location: [cite source]
   - Income level: [cite source or mark as "Unable to verify"]
   - Education: [cite source or mark as "Unable to verify"]

2. **Psychographics** [Confidence: ?]
   - Values: [cite source for each]
   - Aspirations: [cite source]
   - Pain points: [cite source]
   - Influences: [cite source]

3. **Platform Behavior** [Confidence: ?]
   For each platform:
   - Best posting times: [cite source]
   - Content preferences: [cite source]
   - Engagement patterns: [cite source]

4. **Audience Journey** [Confidence: ?]
   - Awareness stage
   - Consideration stage
   - Decision stage

5. **Content Preferences** [Confidence: ?]
   - Formats they engage with: [cite source]
   - Topics they care about: [cite source]

### Output Format:
{
  "primaryAudience": {
    "demographics": {
      "ageRange": "", "ageSource": "",
      "gender": "", "genderSource": "",
      "location": [], "locationSource": "",
      "income": "", "incomeSource": "",
      "education": "", "educationSource": "",
      "overallConfidence": 0.0-1.0
    },
    "psychographics": {
      "values": [{ "value": "", "source": "" }],
      "aspirations": [{ "aspiration": "", "source": "" }],
      "fears": [{ "fear": "", "source": "" }],
      "influences": [{ "influence": "", "source": "" }],
      "overallConfidence": 0.0-1.0
    },
    "painPoints": [{ "point": "", "severity": "high|medium|low", "source": "" }],
    "contentPreferences": []
  },
  "platformBehavior": [{
    "platform": "",
    "bestTimes": [],
    "contentPreferences": [],
    "engagementPattern": "",
    "confidence": 0.0-1.0,
    "evidenceId": ""
  }],
  "audienceJourney": {
    "awareness": "",
    "consideration": "",
    "decision": ""
  },
  "lowConfidenceSections": [],
  "dataGaps": [{ "section": "", "description": "" }]
}

CRITICAL: Do NOT fabricate demographic statistics. If research doesn't provide specific numbers,
say "Based on industry patterns" or "Unable to determine from research."
`.trim()
}

// ============================================================================
// CONTENT STRATEGY GROUNDED PROMPT
// ============================================================================

export function buildGroundedStrategyPrompt(
  intakeData: Record<string, string>,
  researchEvidence: EvidenceBundle[],
  researchGaps: ResearchGap[],
  brandBlueprint: Record<string, unknown>,
  audienceAnalysis: Record<string, unknown>,
  marketIntelligence?: {
    trends?: Array<Record<string, unknown>>
    contentTrends?: Array<Record<string, unknown>>
    recommendations?: string[]
  }
): string {
  const marketContext = marketIntelligence ? `
## MARKET INTELLIGENCE

### Industry Trends
${JSON.stringify(marketIntelligence.trends || [], null, 2)}

### Content Trends
${JSON.stringify(marketIntelligence.contentTrends || [], null, 2)}

### Market Recommendations
${(marketIntelligence.recommendations || []).map(r => `- ${r}`).join("\n")}
` : ""

  return `
${GROUNDING_RULES}

---

## RESEARCH EVIDENCE PROVIDED

${formatEvidenceForPrompt(researchEvidence)}

${marketContext}

## RESEARCH GAPS

${researchGaps.length > 0 ? formatGapsForOutput(researchGaps).join("\n") : "No major gaps"}

---

## BRAND BLUEPRINT (Already Generated)

${JSON.stringify(brandBlueprint, null, 2)}

## AUDIENCE ANALYSIS (Already Generated)

${JSON.stringify(audienceAnalysis, null, 2)}

## CLIENT INTAKE DATA

${Object.entries(intakeData).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

---

## YOUR TASK: Generate Content Strategy

Create a comprehensive Content Strategy grounded in research evidence.
Every recommendation MUST be backed by audience research, market trends, or platform data.

### Required Sections:

1. **Content Pillars** [Confidence: ?]
   For each pillar:
   - Name and description
   - Rationale: [cite audience research or market trends]
   - Content types within this pillar
   - Posting frequency

2. **Platform Strategy** [Confidence: ?]
   For each platform:
   - Why this platform (cite audience behavior research)
   - Content format recommendations (cite platform trends)
   - Optimal posting times (cite research)
   - Engagement approach

3. **Content Themes** [Confidence: ?]
   - Theme name
   - Why it resonates (cite audience psychographics)
   - Example topics

4. **Posting Schedule** [Confidence: ?]
   - Optimal times by platform (cite research)
   - Frequency recommendations (cite best practices)

5. **Engagement Strategy** [Confidence: ?]
   - Approach (cite audience preferences)
   - Tactics
   - Metrics to track

6. **Competitor Differentiation** [Confidence: ?]
   - What competitors are doing (cite competitor research)
   - How to stand out (cite gaps found)

### Output Format:
{
  "contentPillars": [{
    "name": "",
    "description": "",
    "rationale": "",
    "rationaleSource": "",
    "contentTypes": [],
    "frequency": "",
    "confidence": 0.0-1.0
  }],
  "platformStrategies": [{
    "platform": "",
    "whyThisPlatform": "",
    "platformSource": "",
    "contentFormats": [],
    "postingTimes": [],
    "postingTimesSource": "",
    "engagementApproach": "",
    "confidence": 0.0-1.0
  }],
  "contentThemes": [{
    "theme": "",
    "resonanceReason": "",
    "resonanceSource": "",
    "exampleTopics": []
  }],
  "postingSchedule": {
    "optimalTimes": {},
    "timesSource": "",
    "frequencyByPlatform": {},
    "frequencyRationale": ""
  },
  "engagementStrategy": {
    "approach": "",
    "tactics": [],
    "metrics": []
  },
  "competitorDifferentiation": {
    "competitorPatterns": [],
    "gapsIdentified": [],
    "differentiationStrategy": "",
    "evidenceIds": []
  },
  "exampleWeek": [{
    "day": "",
    "platform": "",
    "contentType": "",
    "topic": "",
    "rationale": ""
  }],
  "lowConfidenceSections": [],
  "dataGaps": []
}

CRITICAL: Base all recommendations on the evidence provided. Do not suggest strategies
without citing why they're appropriate for THIS audience based on the research.
`.trim()
}

// ============================================================================
// HELPER: Build Grounded Context
// ============================================================================

export interface GroundedContext {
  evidenceBundles: EvidenceBundle[]
  researchGaps: ResearchGap[]
  competitorProfiles?: Array<Record<string, unknown>>
  audienceData?: Record<string, unknown>
  marketData?: Record<string, unknown>
}

export function buildGroundedSystemPrompt(
  agentType: "brand" | "audience" | "strategy",
  context: GroundedContext
): string {
  const header = `
You are KORA's ${agentType} intelligence agent. You generate professional, evidence-based
deliverables that are grounded in real research data.

${GROUNDING_RULES}

---

## AVAILABLE RESEARCH EVIDENCE

${formatEvidenceForPrompt(context.evidenceBundles)}

## KNOWN RESEARCH GAPS

${context.researchGaps.length > 0 
  ? context.researchGaps.map(g => `- ${g.topic}: ${g.reason} (Impact: ${g.impact})`).join("\n")
  : "No significant gaps identified"}
`

  const contextSections: string[] = []

  if (context.competitorProfiles?.length) {
    contextSections.push(`
## COMPETITOR PROFILES

${context.competitorProfiles.map((c, i) => `
### Competitor ${i + 1}: ${c.name || "Unknown"}
- Positioning: ${c.positioning || "Unknown"}
- Strengths: ${Array.isArray(c.strengths) ? c.strengths.join(", ") : "Unknown"}
- Weaknesses: ${Array.isArray(c.weaknesses) ? c.weaknesses.join(", ") : "Unknown"}
`).join("\n")}`)
  }

  if (context.audienceData) {
    contextSections.push(`
## AUDIENCE RESEARCH DATA

${JSON.stringify(context.audienceData, null, 2)}`)
  }

  if (context.marketData) {
    contextSections.push(`
## MARKET INTELLIGENCE

${JSON.stringify(context.marketData, null, 2)}`)
  }

  return header + contextSections.join("\n\n---\n\n")
}

// ============================================================================
// CONFIDENCE CALCULATOR
// ============================================================================

export function calculateSectionConfidence(
  sourcesUsed: number,
  hasDirectData: boolean,
  hasConflicts: boolean
): { level: string; score: number } {
  let score = 0.3 // Base for general knowledge
  
  if (hasDirectData) score += 0.3
  if (sourcesUsed >= 1) score += 0.15
  if (sourcesUsed >= 2) score += 0.15
  if (sourcesUsed >= 3) score += 0.1
  if (hasConflicts) score -= 0.2
  
  score = Math.max(0, Math.min(1, score))
  
  let level: string
  if (score >= 0.8) level = "HIGH"
  else if (score >= 0.6) level = "MEDIUM"
  else if (score >= 0.4) level = "LOW"
  else level = "UNVERIFIED"
  
  return { level, score }
}
