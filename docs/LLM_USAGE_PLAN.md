# KORA LLM Usage Plan

## Overview

KORA uses a dual-LLM architecture optimized for cost, quality, and task-specific strengths:

- **Gemini** (gemini-1.5-pro, gemini-1.5-flash): Deep reasoning, long-context synthesis, profile understanding, research digestion
- **OpenAI** (gpt-4o, gpt-4o-mini): Extraction, embeddings, classification, cleanup, schema formatting, final structured output

## Provider Selection Principles

### Use Gemini When:
1. Context window exceeds 32K tokens
2. Task requires nuanced reasoning across multiple documents
3. Synthesizing brand/audience/strategy insights from diverse inputs
4. Digesting long transcripts (YouTube, podcasts, interviews)
5. Comparing and contrasting multiple sources
6. Generating weekly intelligence briefs
7. Deep profile understanding and analysis

### Use OpenAI When:
1. Precise JSON schema enforcement required
2. Classification or tagging tasks
3. Embedding generation (RAG)
4. Entity extraction with strict output format
5. Final cleanup pass on Gemini output
6. Deterministic, reproducible results needed
7. Low-latency requirements

## Task Routing Matrix

### OpenAI Tasks (Extraction, Structure, Classification)

| Task Type | Model | Temperature | Use Case |
|-----------|-------|-------------|----------|
| `embeddings` | text-embedding-3-small | N/A | RAG vector generation |
| `classification` | gpt-4o-mini | 0.2 | Source type classification |
| `tagging` | gpt-4o-mini | 0.2 | Content tagging |
| `structured_output` | gpt-4o | 0.3 | Final JSON output |
| `json_formatting` | gpt-4o | 0.2 | Clean JSON formatting |
| `schema_enforcement` | gpt-4o | 0.1 | Validate schema compliance |
| `cleanup` | gpt-4o-mini | 0.2 | Text normalization |
| `entity_extraction` | gpt-4o | 0.2 | Extract entities |
| `relevance_scoring` | gpt-4o-mini | 0.1 | Score relevance 0-1 |
| `sentiment_analysis` | gpt-4o-mini | 0.2 | Sentiment detection |
| `summarization` | gpt-4o-mini | 0.4 | Create summaries |
| `quality_review` | gpt-4o | 0.2 | Review output quality |
| `intake_clarification` | gpt-4o | 0.3 | Clarify user inputs |
| `data_normalization` | gpt-4o-mini | 0.1 | Normalize data |
| `keyword_extraction` | gpt-4o-mini | 0.2 | Extract keywords |
| `topic_detection` | gpt-4o-mini | 0.2 | Detect topics |
| `language_detection` | gpt-4o-mini | 0.1 | Detect language |
| `spam_detection` | gpt-4o-mini | 0.1 | Filter spam |
| `duplicate_detection` | gpt-4o-mini | 0.1 | Find duplicates |
| `campaign_formatting` | gpt-4o | 0.2 | Format campaign objects |

### Gemini Tasks (Reasoning, Synthesis, Research)

| Task Type | Model | Temperature | Use Case |
|-----------|-------|-------------|----------|
| `long_context_synthesis` | gemini-1.5-pro | 0.7 | Synthesize large docs |
| `website_analysis` | gemini-1.5-flash | 0.5 | Analyze websites |
| `profile_analysis` | gemini-1.5-flash | 0.5 | Analyze social profiles |
| `transcript_digestion` | gemini-1.5-pro | 0.5 | Digest transcripts |
| `strategy_reasoning` | gemini-1.5-pro | 0.7 | Strategic reasoning |
| `brand_synthesis` | gemini-1.5-pro | 0.7 | Brand identity synthesis |
| `audience_synthesis` | gemini-1.5-pro | 0.7 | Audience insight synthesis |
| `research_digestion` | gemini-1.5-pro | 0.6 | Digest research findings |
| `source_comparison` | gemini-1.5-pro | 0.5 | Compare sources |
| `trend_analysis` | gemini-1.5-pro | 0.6 | Analyze trends |
| `competitive_analysis` | gemini-1.5-pro | 0.6 | Competitor analysis |
| `market_intelligence` | gemini-1.5-pro | 0.6 | Market intelligence |
| `content_strategy_generation` | gemini-1.5-pro | 0.7 | Generate strategies |
| `insight_generation` | gemini-1.5-pro | 0.7 | Generate insights |
| `weekly_brief_generation` | gemini-1.5-pro | 0.7 | Weekly briefs |
| `translation_synthesis` | gemini-1.5-pro | 0.4 | Translate with context |
| `profile_understanding` | gemini-1.5-pro | 0.6 | Deep profile understanding |
| `industry_analysis` | gemini-1.5-pro | 0.6 | Industry analysis |
| `campaign_strategy` | gemini-1.5-pro | 0.7 | Campaign strategy |

## Agent-Specific LLM Usage

### 1. Intake Agent Pipeline
```
User Input -> OpenAI (intake_clarification)
           -> OpenAI (data_normalization)
           -> OpenAI (entity_extraction)
           -> Ready for synthesis
```

### 2. Brand Identity Agent
```
Normalized Intake -> Gemini (brand_synthesis)
                  -> Gemini (profile_understanding)
                  -> OpenAI (schema_enforcement)
                  -> OpenAI (structured_output)
                  -> Final Brand Blueprint
```

### 3. Audience Intelligence Agent
```
Intake + Social Audits -> Gemini (audience_synthesis)
                       -> Gemini (profile_analysis)
                       -> OpenAI (entity_extraction)
                       -> OpenAI (structured_output)
                       -> Final Audience Analysis
```

### 4. Strategy Architect Agent
```
Blueprint + Audience -> Gemini (strategy_reasoning)
                     -> Gemini (content_strategy_generation)
                     -> OpenAI (quality_review)
                     -> OpenAI (structured_output)
                     -> Final Brand Strategy
```

### 5. Source Discovery Agent
```
Filter Criteria -> OpenAI (keyword_extraction)
               -> Search Sources
               -> OpenAI (classification)
               -> OpenAI (relevance_scoring)
               -> Candidate Sources
```

### 6. Source Processing Agent
```
Raw Content -> OpenAI (language_detection)
            -> OpenAI (spam_detection)
            -> OpenAI (cleanup)
            -> Gemini (transcript_digestion) // if video/audio
            -> OpenAI (entity_extraction)
            -> OpenAI (summarization)
            -> Processed Content
```

### 7. Core Intelligence Agent
```
Processed Sources -> Gemini (research_digestion)
                  -> Gemini (trend_analysis)
                  -> Gemini (source_comparison)
                  -> OpenAI (relevance_scoring)
                  -> OpenAI (tagging)
                  -> Intelligence Pool
```

### 8. Content Strategy Agent
```
Intelligence + Blueprint -> Gemini (insight_generation)
                        -> Gemini (content_strategy_generation)
                        -> OpenAI (json_formatting)
                        -> OpenAI (structured_output)
                        -> Content Strategy Drafts
```

### 9. Campaign Assembly Agent
```
Approved Strategies -> Gemini (campaign_strategy)
                    -> OpenAI (campaign_formatting)
                    -> OpenAI (schema_enforcement)
                    -> Campaign Objects
```

### 10. RAG Intelligence Agent
```
Content -> OpenAI (embeddings)
        -> Store in Vector DB
        
Query -> OpenAI (embeddings)
      -> Retrieve Relevant
      -> Gemini (long_context_synthesis)
      -> Response
```

### 11. Telegram Delivery Agent
```
Intelligence Items -> OpenAI (summarization)
                   -> Format for Telegram
                   -> Send
```

## Hybrid Workflows

### Strategy Generation (Gemini First, OpenAI Cleanup)
```typescript
// Step 1: Gemini generates strategy reasoning
const reasoning = await router.complete({
  taskType: "strategy_reasoning",
  prompt: buildStrategyPrompt(blueprint, audience, insights),
  agentName: "StrategyArchitect"
})

// Step 2: OpenAI enforces schema and cleans output
const final = await router.complete({
  taskType: "structured_output",
  prompt: `Convert to valid JSON schema:\n${reasoning.content}`,
  jsonSchema: STRATEGY_SCHEMA,
  agentName: "StrategyArchitect"
})
```

### Research Digestion (Gemini Synthesis, OpenAI Extraction)
```typescript
// Step 1: Gemini digests research
const digest = await router.complete({
  taskType: "research_digestion",
  prompt: buildDigestPrompt(sources),
  agentName: "CoreIntelligence"
})

// Step 2: OpenAI extracts structured entities
const entities = await router.complete({
  taskType: "entity_extraction",
  prompt: `Extract entities:\n${digest.content}`,
  jsonSchema: ENTITY_SCHEMA,
  agentName: "CoreIntelligence"
})
```

## Cost Optimization

### Model Selection by Cost (per 1M tokens)

| Model | Input | Output | Best For |
|-------|-------|--------|----------|
| gpt-4o-mini | $0.15 | $0.60 | High-volume classification, tagging |
| gemini-1.5-flash | $0.075 | $0.30 | Website/profile analysis |
| gpt-4o | $2.50 | $10.00 | Schema enforcement, structured output |
| gemini-1.5-pro | $1.25 | $5.00 | Deep reasoning, synthesis |
| text-embedding-3-small | $0.02 | N/A | RAG embeddings |

### Cost-Saving Strategies

1. **Use gpt-4o-mini for high-volume tasks**: Classification, tagging, spam detection
2. **Use gemini-1.5-flash for analysis**: Website and profile analysis (cheaper than pro)
3. **Batch similar requests**: Group embeddings and classifications
4. **Cache responses**: Hash prompts and cache results
5. **Progressive detail**: Start with flash models, escalate to pro if needed

## Fallback Strategy

All Gemini tasks have OpenAI fallbacks configured:

```typescript
{
  provider: "gemini",
  model: "gemini-1.5-pro",
  fallbackProvider: "openai",
  fallbackModel: "gpt-4o",
  temperature: 0.7
}
```

The router automatically:
1. Attempts primary provider
2. On failure, switches to fallback
3. Logs the fallback for monitoring
4. Tracks success rates per provider

## Monitoring & Observability

All LLM calls are tracked in `llm_runs` table:
- Provider and model used
- Token usage (input/output)
- Cost calculation
- Latency
- Cache hit rate
- Error rate

View in Mission Control: Health and Logs > LLM Usage

## Environment Variables

```env
# Required
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...

# Optional tuning
LLM_MAX_RETRIES=3
LLM_RETRY_DELAY_MS=1000
LLM_ENABLE_CACHING=true
LLM_LOG_FULL_PROMPTS=false
```

## Adding New Task Types

1. Add to `LLMTaskType` union in `types/llm.ts`
2. Add routing config to `TASK_ROUTING` in `types/llm.ts`
3. Router automatically picks up new task type
4. Use via `router.complete({ taskType: "new_task", ... })`
