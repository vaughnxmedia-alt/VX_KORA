# KORA Core Intelligence v2: Architecture Plan

## Executive Summary

KORA v2 transforms from a "generate and deliver" system into a **research-grade intelligence platform** for PR and marketing. The core principle: every claim must trace back to evidence, every output must pass quality gates, and the system must learn from outcomes without leaking tenant data.

---

## 1. Phased Architecture Plan

### Phase 1: Foundation (Weeks 1-3)
**Goal: Build the knowledge and evidence infrastructure**

- [ ] Implement Core Knowledge Base with universal PR/marketing frameworks
- [ ] Add pgvector extension for semantic search in Postgres
- [ ] Build citation graph schema (claim → source → evidence chain)
- [ ] Create prompt template system with versioning
- [ ] Implement fact classification: user-provided vs researched vs inferred

### Phase 2: Research Engine (Weeks 4-6)
**Goal: Multi-hop research with verification**

- [ ] LLM-generated query planning (not fixed templates)
- [ ] Implement research sessions with provenance tracking
- [ ] Add source credibility scoring beyond domain heuristics
- [ ] Build claim extraction and cross-reference verification
- [ ] Create research loop: query → extract → verify → expand
- [ ] Add YouTube transcript intelligence pipeline

### Phase 3: Reasoning Layer (Weeks 7-9)
**Goal: Structured reasoning and pattern detection**

- [ ] Build concept ontology for PR/marketing domain
- [ ] Implement hypothesis generation and testing
- [ ] Create pattern memory for successful strategies
- [ ] Add contradiction detection across evidence
- [ ] Build strategic scoring with confidence intervals

### Phase 4: Synthesis Upgrade (Weeks 10-12)
**Goal: Intelligence agents with iterative refinement**

- [ ] Refactor agents to support self-reflection loops
- [ ] Implement confidence-based routing (re-research if below threshold)
- [ ] Add parallel generation with merge/conflict resolution
- [ ] Build quality gates at every synthesis stage
- [ ] Create deliverable versioning with diff tracking

### Phase 5: Learning System (Weeks 13-15)
**Goal: System improvement without tenant leakage**

- [ ] Implement anonymized outcome tracking
- [ ] Build pattern extraction from successful deliverables
- [ ] Create failure pattern library
- [ ] Add source quality signals from usage patterns
- [ ] Build recommendation improvement loop

### Phase 6: Production Hardening (Weeks 16-18)
**Goal: Scale, observability, and reliability**

- [ ] Add distributed tracing with OpenTelemetry
- [ ] Implement pipeline checkpointing for crash recovery
- [ ] Build quality dashboards and alerting
- [ ] Add rate limiting and cost controls
- [ ] Create A/B testing for prompt variants

---

## 2. Recommended Folder Structure

```
services/
└── kora-intelligence/
    ├── src/
    │   ├── core/                          # Core system infrastructure
    │   │   ├── config/
    │   │   │   ├── llm-routing.ts         # Model selection by task
    │   │   │   ├── confidence-thresholds.ts
    │   │   │   └── rate-limits.ts
    │   │   ├── database/
    │   │   │   ├── client.ts
    │   │   │   ├── repositories/          # Data access layer
    │   │   │   └── migrations/
    │   │   ├── telemetry/
    │   │   │   ├── tracing.ts
    │   │   │   ├── metrics.ts
    │   │   │   └── logging.ts
    │   │   └── errors/
    │   │       ├── error-types.ts
    │   │       └── error-handlers.ts
    │   │
    │   ├── knowledge/                     # Core Knowledge Layer
    │   │   ├── frameworks/                # Universal PR/marketing frameworks
    │   │   │   ├── brand-positioning.ts
    │   │   │   ├── audience-segmentation.ts
    │   │   │   ├── content-strategy.ts
    │   │   │   └── platform-intelligence.ts
    │   │   ├── heuristics/                # Decision rules
    │   │   │   ├── quality-rules.ts
    │   │   │   ├── scoring-rules.ts
    │   │   │   └── red-flags.ts
    │   │   ├── ontology/                  # Concept graph
    │   │   │   ├── pr-concepts.ts
    │   │   │   ├── marketing-concepts.ts
    │   │   │   └── audience-concepts.ts
    │   │   ├── confidentiality/           # Data isolation rules
    │   │   │   ├── tenant-boundaries.ts
    │   │   │   └── anonymization.ts
    │   │   └── index.ts
    │   │
    │   ├── research/                      # Research Layer
    │   │   ├── planning/                  # Query planning
    │   │   │   ├── query-generator.ts     # LLM-based query generation
    │   │   │   ├── research-planner.ts    # Multi-hop planning
    │   │   │   └── session-manager.ts     # Research session state
    │   │   ├── discovery/                 # Source discovery
    │   │   │   ├── web-search.ts
    │   │   │   ├── social-discovery.ts
    │   │   │   ├── youtube-discovery.ts
    │   │   │   └── news-discovery.ts
    │   │   ├── extraction/                # Content extraction
    │   │   │   ├── website-analyzer.ts
    │   │   │   ├── social-analyzer.ts
    │   │   │   ├── transcript-processor.ts
    │   │   │   ├── article-extractor.ts
    │   │   │   └── claim-extractor.ts
    │   │   ├── verification/              # Fact verification
    │   │   │   ├── cross-reference.ts
    │   │   │   ├── source-validator.ts
    │   │   │   └── credibility-scorer.ts
    │   │   ├── specialized/               # Domain-specific research
    │   │   │   ├── competitor-research.ts
    │   │   │   ├── audience-research.ts
    │   │   │   └── market-research.ts
    │   │   └── orchestrator.ts            # Research loop coordinator
    │   │
    │   ├── evidence/                      # Evidence Layer
    │   │   ├── citations/
    │   │   │   ├── citation-tracker.ts    # Claim-to-source linking
    │   │   │   ├── provenance-chain.ts    # Full evidence trail
    │   │   │   └── citation-graph.ts      # Graph operations
    │   │   ├── confidence/
    │   │   │   ├── confidence-scorer.ts   # Multi-factor scoring
    │   │   │   ├── confidence-aggregator.ts
    │   │   │   └── threshold-checker.ts
    │   │   ├── conflicts/
    │   │   │   ├── conflict-detector.ts   # Contradicting evidence
    │   │   │   └── conflict-resolver.ts
    │   │   ├── gaps/
    │   │   │   ├── gap-detector.ts        # Missing evidence
    │   │   │   └── gap-reporter.ts
    │   │   ├── bundles/
    │   │   │   ├── bundle-builder.ts
    │   │   │   └── bundle-validator.ts
    │   │   └── types.ts
    │   │
    │   ├── reasoning/                     # Reasoning Layer
    │   │   ├── ontology/
    │   │   │   ├── concept-graph.ts       # Domain concept network
    │   │   │   ├── relationship-types.ts
    │   │   │   └── graph-queries.ts
    │   │   ├── hypotheses/
    │   │   │   ├── hypothesis-generator.ts
    │   │   │   ├── hypothesis-tester.ts
    │   │   │   └── hypothesis-ranker.ts
    │   │   ├── patterns/
    │   │   │   ├── pattern-memory.ts      # Successful patterns
    │   │   │   ├── failure-patterns.ts    # What to avoid
    │   │   │   └── pattern-matcher.ts
    │   │   ├── scoring/
    │   │   │   ├── strategic-scorer.ts
    │   │   │   └── multi-criteria.ts
    │   │   └── contradictions/
    │   │       ├── contradiction-handler.ts
    │   │       └── resolution-strategies.ts
    │   │
    │   ├── synthesis/                     # Synthesis Layer (Agents)
    │   │   ├── base/
    │   │   │   ├── base-agent.ts
    │   │   │   ├── reflective-agent.ts    # Self-evaluation capability
    │   │   │   └── confidential-agent.ts
    │   │   ├── agents/
    │   │   │   ├── brand-intelligence/
    │   │   │   │   ├── brand-agent.ts
    │   │   │   │   ├── brand-prompts.ts
    │   │   │   │   └── brand-schema.ts
    │   │   │   ├── audience-intelligence/
    │   │   │   │   ├── audience-agent.ts
    │   │   │   │   ├── audience-prompts.ts
    │   │   │   │   └── audience-schema.ts
    │   │   │   ├── strategy-intelligence/
    │   │   │   │   ├── strategy-agent.ts
    │   │   │   │   ├── strategy-prompts.ts
    │   │   │   │   └── strategy-schema.ts
    │   │   │   └── quality-review/
    │   │   │       ├── review-agent.ts
    │   │   │       ├── review-prompts.ts
    │   │   │       └── review-criteria.ts
    │   │   ├── orchestration/
    │   │   │   ├── pipeline-orchestrator.ts
    │   │   │   ├── stage-router.ts        # Confidence-based routing
    │   │   │   ├── parallel-executor.ts
    │   │   │   └── checkpoint-manager.ts
    │   │   └── quality-gates/
    │   │       ├── gate-definitions.ts
    │   │       ├── gate-checker.ts
    │   │       └── rejection-handler.ts
    │   │
    │   ├── output/                        # Output Layer
    │   │   ├── deliverables/
    │   │   │   ├── brand-blueprint.ts
    │   │   │   ├── brand-strategy.ts
    │   │   │   ├── audience-analysis.ts
    │   │   │   ├── content-strategy.ts
    │   │   │   └── campaign-ideas.ts
    │   │   ├── formatting/
    │   │   │   ├── pdf-generator.ts
    │   │   │   ├── markdown-formatter.ts
    │   │   │   └── telegram-formatter.ts
    │   │   ├── delivery/
    │   │   │   ├── telegram-delivery.ts
    │   │   │   ├── email-delivery.ts
    │   │   │   └── webhook-delivery.ts
    │   │   └── versioning/
    │   │       ├── version-tracker.ts
    │   │       └── diff-generator.ts
    │   │
    │   ├── learning/                      # Learning Layer
    │   │   ├── outcomes/
    │   │   │   ├── outcome-tracker.ts     # Track what worked
    │   │   │   └── outcome-analyzer.ts
    │   │   ├── patterns/
    │   │   │   ├── success-extractor.ts   # Extract winning patterns
    │   │   │   ├── failure-extractor.ts
    │   │   │   └── pattern-anonymizer.ts  # Remove tenant specifics
    │   │   ├── sources/
    │   │   │   ├── source-quality-tracker.ts
    │   │   │   └── source-recommender.ts
    │   │   ├── feedback/
    │   │   │   ├── feedback-collector.ts
    │   │   │   └── feedback-processor.ts
    │   │   └── global-memory/
    │   │       ├── shared-insights.ts     # Tenant-safe shared learning
    │   │       └── memory-curator.ts
    │   │
    │   ├── llm/                           # LLM Infrastructure
    │   │   ├── providers/
    │   │   │   ├── openai-client.ts
    │   │   │   ├── gemini-client.ts
    │   │   │   └── provider-interface.ts
    │   │   ├── routing/
    │   │   │   ├── task-router.ts
    │   │   │   ├── cost-optimizer.ts
    │   │   │   └── fallback-handler.ts
    │   │   ├── prompts/
    │   │   │   ├── prompt-registry.ts
    │   │   │   ├── prompt-templates.ts    # Parameterized prompts
    │   │   │   └── prompt-versioning.ts
    │   │   ├── structured-output/
    │   │   │   ├── schema-validator.ts
    │   │   │   └── output-parser.ts
    │   │   └── caching/
    │   │       ├── response-cache.ts
    │   │       └── embedding-cache.ts
    │   │
    │   ├── types/                         # Type definitions
    │   │   ├── knowledge.ts
    │   │   ├── research.ts
    │   │   ├── evidence.ts
    │   │   ├── reasoning.ts
    │   │   ├── synthesis.ts
    │   │   ├── output.ts
    │   │   ├── learning.ts
    │   │   └── common.ts
    │   │
    │   └── index.ts
    │
    ├── tests/
    │   ├── unit/
    │   ├── integration/
    │   └── fixtures/
    │
    └── package.json
```

---

## 3. Recommended Agent Structure

### Agent Hierarchy

```
                                    ┌─────────────────────┐
                                    │   BaseIntelAgent    │
                                    │  - retry logic      │
                                    │  - metrics          │
                                    │  - LLM access       │
                                    └──────────┬──────────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
           ┌────────┴────────┐       ┌────────┴────────┐        ┌────────┴────────┐
           │ ReflectiveAgent │       │ ConfidentialAgent│        │  ResearchAgent  │
           │ - self-evaluate │       │ - tenant isolation│       │ - multi-hop     │
           │ - iterate       │       │ - data filtering  │       │ - verification  │
           └────────┬────────┘       └────────┬─────────┘        └────────┬────────┘
                    │                         │                           │
    ┌───────────────┼───────────────┐         │              ┌────────────┼────────────┐
    │               │               │         │              │            │            │
┌───┴───┐      ┌────┴────┐    ┌────┴────┐    │         ┌────┴────┐  ┌────┴────┐  ┌────┴────┐
│ Brand │      │ Audience│    │Strategy │    │         │Competitor│  │ Market  │  │ Profile │
│ Agent │      │  Agent  │    │  Agent  │    │         │ Research │  │ Research│  │ Research│
└───────┘      └─────────┘    └─────────┘    │         └──────────┘  └─────────┘  └─────────┘
                                             │
                               ┌─────────────┴─────────────┐
                               │                           │
                          ┌────┴────┐                 ┌────┴────┐
                          │ Quality │                 │Confidenti│
                          │ Review  │                 │ality Rev │
                          └─────────┘                 └──────────┘
```

### Agent Definitions

```typescript
// Base agent with reflection capability
interface ReflectiveAgentConfig {
  maxReflectionIterations: number;
  confidenceThreshold: number;
  selfEvaluationPrompt: string;
}

abstract class ReflectiveAgent<TInput, TOutput> extends BaseIntelAgent<TInput, TOutput> {
  // Core reflection loop
  async executeWithReflection(input: TInput): Promise<AgentOutput<TOutput>> {
    let result = await this.execute(input);
    let iterations = 0;
    
    while (iterations < this.config.maxReflectionIterations) {
      const evaluation = await this.selfEvaluate(result);
      
      if (evaluation.confidence >= this.config.confidenceThreshold) {
        break;
      }
      
      const improvements = await this.planImprovements(evaluation);
      result = await this.applyImprovements(result, improvements);
      iterations++;
    }
    
    return result;
  }
  
  abstract selfEvaluate(output: TOutput): Promise<SelfEvaluation>;
  abstract planImprovements(evaluation: SelfEvaluation): Promise<ImprovementPlan>;
  abstract applyImprovements(output: TOutput, plan: ImprovementPlan): Promise<AgentOutput<TOutput>>;
}

// Research agent with multi-hop capability
interface ResearchAgentConfig {
  maxHops: number;
  minSourcesPerClaim: number;
  verificationRequired: boolean;
}

abstract class ResearchAgent<TInput, TOutput> extends BaseIntelAgent<TInput, TOutput> {
  async executeResearchLoop(input: TInput): Promise<ResearchResult<TOutput>> {
    const plan = await this.createResearchPlan(input);
    const session = this.createSession(plan);
    
    for (const step of plan.steps) {
      const queries = await this.generateQueries(step, session.context);
      const results = await this.executeQueries(queries);
      const claims = await this.extractClaims(results);
      const verified = await this.verifyClaims(claims);
      
      session.addFindings(verified);
      
      // Multi-hop: generate follow-up queries based on findings
      if (session.hasGaps() && session.hopsRemaining > 0) {
        const followUp = await this.planFollowUp(session.gaps);
        plan.addSteps(followUp);
      }
    }
    
    return session.synthesize();
  }
  
  abstract createResearchPlan(input: TInput): Promise<ResearchPlan>;
  abstract generateQueries(step: ResearchStep, context: ResearchContext): Promise<Query[]>;
  abstract extractClaims(results: SearchResult[]): Promise<Claim[]>;
  abstract verifyClaims(claims: Claim[]): Promise<VerifiedClaim[]>;
}
```

### Intelligence Agent Specifications

| Agent | Input | Output | LLM Strategy | Reflection |
|-------|-------|--------|--------------|------------|
| BrandIntelligenceAgent | Profile + Research + Evidence | GroundedBrandBlueprint | Gemini for synthesis, OpenAI for formatting | Yes, 2 iterations |
| AudienceIntelligenceAgent | Profile + Audience Research + Evidence | GroundedAudienceAnalysis | Gemini for synthesis, OpenAI for formatting | Yes, 2 iterations |
| StrategyIntelligenceAgent | Brand + Audience + Market Evidence | GroundedContentStrategy | Gemini for synthesis, OpenAI for formatting | Yes, 3 iterations |
| QualityReviewAgent | Any Deliverable | ReviewResult with scores | OpenAI for fast evaluation | No |
| ConfidentialityReviewAgent | Any Output | SanitizedOutput | OpenAI for classification | No |

---

## 4. Recommended Data Model Structure

### Core Tables

```sql
-- =============================================================================
-- KNOWLEDGE LAYER
-- =============================================================================

-- Universal frameworks (global, not tenant-specific)
CREATE TABLE core_frameworks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL, -- 'brand', 'audience', 'content', 'platform'
    name TEXT NOT NULL,
    description TEXT,
    principles JSONB NOT NULL DEFAULT '[]',
    application_rules JSONB NOT NULL DEFAULT '[]',
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Domain ontology (PR/marketing concept graph)
CREATE TABLE core_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    definition TEXT,
    related_concepts TEXT[] DEFAULT '{}',
    embedding VECTOR(1536), -- pgvector
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE core_concept_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_concept_id UUID REFERENCES core_concepts(id),
    target_concept_id UUID REFERENCES core_concepts(id),
    relationship_type TEXT NOT NULL, -- 'is_a', 'part_of', 'influences', 'contradicts'
    strength DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality heuristics
CREATE TABLE core_quality_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_type TEXT NOT NULL, -- 'red_flag', 'quality_gate', 'best_practice'
    applies_to TEXT NOT NULL, -- 'brand_blueprint', 'content_strategy', etc.
    condition JSONB NOT NULL,
    action TEXT NOT NULL, -- 'reject', 'warn', 'suggest'
    message TEXT,
    severity TEXT DEFAULT 'medium',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- RESEARCH LAYER
-- =============================================================================

-- Research sessions (group related queries)
CREATE TABLE research_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    pipeline_run_id UUID,
    session_type TEXT NOT NULL, -- 'competitor', 'audience', 'market', 'profile'
    status TEXT DEFAULT 'active',
    query_count INTEGER DEFAULT 0,
    source_count INTEGER DEFAULT 0,
    claim_count INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

-- Research queries with provenance
CREATE TABLE research_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES research_sessions(id) ON DELETE CASCADE,
    parent_query_id UUID REFERENCES research_queries(id), -- for multi-hop
    query_text TEXT NOT NULL,
    query_type TEXT NOT NULL, -- 'initial', 'follow_up', 'verification'
    generation_method TEXT NOT NULL, -- 'template', 'llm_generated', 'user_provided'
    provider TEXT NOT NULL, -- 'tavily', 'exa', 'youtube', etc.
    result_count INTEGER DEFAULT 0,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discovered sources
CREATE TABLE research_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID REFERENCES research_queries(id),
    url TEXT NOT NULL,
    title TEXT,
    domain TEXT,
    source_type TEXT, -- 'article', 'video', 'social_post', 'website'
    published_at TIMESTAMPTZ,
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    raw_content TEXT,
    extracted_content TEXT,
    credibility_score DECIMAL(3,2),
    relevance_score DECIMAL(3,2),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_research_sources_url ON research_sources(url);
CREATE INDEX idx_research_sources_domain ON research_sources(domain);

-- =============================================================================
-- EVIDENCE LAYER
-- =============================================================================

-- Extracted claims with provenance
CREATE TABLE evidence_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES research_sources(id) ON DELETE CASCADE,
    claim_text TEXT NOT NULL,
    claim_type TEXT NOT NULL, -- 'fact', 'statistic', 'opinion', 'quote'
    extraction_method TEXT NOT NULL, -- 'llm', 'rule_based', 'user_provided'
    supporting_quote TEXT, -- verbatim from source
    confidence DECIMAL(3,2) NOT NULL,
    verified BOOLEAN DEFAULT false,
    verification_sources UUID[] DEFAULT '{}',
    embedding VECTOR(1536),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evidence_claims_embedding ON evidence_claims 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Claim verification attempts
CREATE TABLE claim_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID REFERENCES evidence_claims(id) ON DELETE CASCADE,
    verification_type TEXT NOT NULL, -- 'cross_reference', 'fact_check', 'source_check'
    result TEXT NOT NULL, -- 'confirmed', 'contradicted', 'uncertain'
    evidence_source_id UUID REFERENCES research_sources(id),
    confidence_adjustment DECIMAL(3,2),
    notes TEXT,
    verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Evidence conflicts
CREATE TABLE evidence_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_a_id UUID REFERENCES evidence_claims(id),
    claim_b_id UUID REFERENCES evidence_claims(id),
    conflict_type TEXT NOT NULL, -- 'contradiction', 'inconsistency', 'outdated'
    resolution TEXT, -- 'prefer_a', 'prefer_b', 'merge', 'exclude_both'
    resolution_reason TEXT,
    resolved_at TIMESTAMPTZ
);

-- Evidence bundles (claim + all supporting sources)
CREATE TABLE evidence_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    bundle_name TEXT NOT NULL,
    claim_summary TEXT NOT NULL,
    claim_ids UUID[] NOT NULL,
    aggregate_confidence DECIMAL(3,2) NOT NULL,
    source_count INTEGER,
    has_conflicts BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research gaps
CREATE TABLE research_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES research_sessions(id),
    tenant_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    gap_type TEXT NOT NULL, -- 'missing_data', 'low_confidence', 'no_sources'
    topic TEXT NOT NULL,
    impact TEXT NOT NULL, -- 'critical', 'significant', 'minor'
    attempted_queries TEXT[],
    suggested_actions TEXT[],
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- REASONING LAYER
-- =============================================================================

-- Generated hypotheses
CREATE TABLE reasoning_hypotheses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    session_id UUID REFERENCES research_sessions(id),
    hypothesis_text TEXT NOT NULL,
    hypothesis_type TEXT, -- 'brand_position', 'audience_behavior', 'content_opportunity'
    supporting_evidence UUID[], -- claim IDs
    contradicting_evidence UUID[],
    confidence DECIMAL(3,2),
    status TEXT DEFAULT 'proposed', -- 'proposed', 'testing', 'supported', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pattern memory (anonymized, global)
CREATE TABLE reasoning_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type TEXT NOT NULL, -- 'success', 'failure', 'antipattern'
    domain TEXT NOT NULL, -- 'brand', 'audience', 'content', 'campaign'
    pattern_description TEXT NOT NULL,
    conditions JSONB NOT NULL, -- when this pattern applies
    outcomes JSONB NOT NULL, -- what typically happens
    confidence DECIMAL(3,2),
    occurrence_count INTEGER DEFAULT 1,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SYNTHESIS LAYER (Deliverables)
-- =============================================================================

-- Deliverable versions with full history
CREATE TABLE deliverable_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deliverable_type TEXT NOT NULL, -- 'brand_blueprint', 'audience_analysis', etc.
    tenant_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content JSONB NOT NULL,
    evidence_bundle_ids UUID[],
    research_session_ids UUID[],
    overall_confidence DECIMAL(3,2),
    field_confidences JSONB, -- per-field confidence scores
    generation_metadata JSONB, -- LLM calls, prompts used, etc.
    diff_from_previous JSONB, -- what changed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(deliverable_type, tenant_id, version_number)
);

-- Quality review results
CREATE TABLE deliverable_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deliverable_version_id UUID REFERENCES deliverable_versions(id) ON DELETE CASCADE,
    review_type TEXT NOT NULL, -- 'quality', 'confidentiality', 'evidence'
    reviewer TEXT NOT NULL, -- 'quality_agent', 'confidentiality_agent', 'human'
    passed BOOLEAN NOT NULL,
    scores JSONB NOT NULL, -- individual criteria scores
    issues JSONB DEFAULT '[]', -- problems found
    suggestions JSONB DEFAULT '[]', -- improvements
    reviewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- LEARNING LAYER
-- =============================================================================

-- Outcome tracking (anonymized)
CREATE TABLE learning_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outcome_type TEXT NOT NULL, -- 'deliverable_accepted', 'revision_requested', etc.
    deliverable_type TEXT NOT NULL,
    industry_category TEXT, -- anonymized industry
    tenant_size TEXT, -- 'small', 'medium', 'large'
    metrics JSONB NOT NULL, -- confidence scores, review scores, etc.
    patterns_identified UUID[], -- linked pattern IDs
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source quality signals
CREATE TABLE learning_source_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL,
    source_type TEXT NOT NULL,
    signal_type TEXT NOT NULL, -- 'cited_in_accepted', 'led_to_revision', 'high_credibility'
    signal_strength DECIMAL(3,2),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_learning_source_domain ON learning_source_signals(domain);

-- Global insights (tenant-safe aggregations)
CREATE TABLE learning_global_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_type TEXT NOT NULL,
    domain TEXT NOT NULL, -- 'brand', 'audience', 'content'
    insight_text TEXT NOT NULL,
    supporting_data JSONB NOT NULL, -- aggregated, anonymized
    confidence DECIMAL(3,2),
    applicable_to JSONB, -- conditions for applying this insight
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Data Classification

| Data Type | Scope | Sharing | Examples |
|-----------|-------|---------|----------|
| Core Knowledge | Global | All tenants | Frameworks, ontology, quality rules |
| Research Sources | Session | Single tenant | URLs, content, claims for a specific research |
| Evidence Claims | Tenant | Single tenant | Extracted facts for tenant deliverables |
| Deliverables | Tenant | Single tenant | Brand blueprints, strategies |
| Patterns | Global | All tenants (anonymized) | Success/failure patterns without tenant data |
| Outcomes | Global | Aggregated only | Metrics without identifying info |

---

## 5. Recommended LLM Routing Strategy

### Task-to-Model Mapping

```typescript
const LLM_ROUTING_CONFIG = {
  // ==========================================================================
  // RESEARCH TASKS - Primarily Gemini for context, OpenAI for extraction
  // ==========================================================================
  
  query_generation: {
    primary: { provider: 'gemini', model: 'gemini-1.5-flash' },
    fallback: { provider: 'openai', model: 'gpt-4o-mini' },
    rationale: 'Needs context understanding but speed matters'
  },
  
  content_extraction: {
    primary: { provider: 'openai', model: 'gpt-4o-mini' },
    fallback: { provider: 'gemini', model: 'gemini-1.5-flash' },
    rationale: 'Structured extraction, consistent formatting'
  },
  
  claim_extraction: {
    primary: { provider: 'openai', model: 'gpt-4o-mini' },
    fallback: null,
    rationale: 'Needs precise, consistent claim identification'
  },
  
  transcript_digestion: {
    primary: { provider: 'gemini', model: 'gemini-1.5-pro' },
    fallback: { provider: 'openai', model: 'gpt-4o' },
    rationale: 'Long context (1M tokens), complex reasoning'
  },
  
  website_analysis: {
    primary: { provider: 'gemini', model: 'gemini-1.5-pro' },
    fallback: { provider: 'openai', model: 'gpt-4o' },
    rationale: 'Multi-page context, brand understanding'
  },
  
  // ==========================================================================
  // EVIDENCE TASKS - Primarily OpenAI for precision
  // ==========================================================================
  
  credibility_scoring: {
    primary: { provider: 'openai', model: 'gpt-4o-mini' },
    fallback: null,
    rationale: 'Consistent scoring, fast'
  },
  
  claim_verification: {
    primary: { provider: 'openai', model: 'gpt-4o' },
    fallback: { provider: 'gemini', model: 'gemini-1.5-pro' },
    rationale: 'Needs high accuracy for fact checking'
  },
  
  conflict_detection: {
    primary: { provider: 'openai', model: 'gpt-4o' },
    fallback: null,
    rationale: 'Logical reasoning about contradictions'
  },
  
  // ==========================================================================
  // REASONING TASKS - Gemini for depth, OpenAI for structure
  // ==========================================================================
  
  hypothesis_generation: {
    primary: { provider: 'gemini', model: 'gemini-1.5-pro' },
    fallback: { provider: 'openai', model: 'gpt-4o' },
    rationale: 'Creative reasoning, pattern recognition'
  },
  
  pattern_matching: {
    primary: { provider: 'openai', model: 'gpt-4o-mini' },
    fallback: null,
    rationale: 'Fast classification against known patterns'
  },
  
  strategic_scoring: {
    primary: { provider: 'gemini', model: 'gemini-1.5-flash' },
    fallback: { provider: 'openai', model: 'gpt-4o-mini' },
    rationale: 'Multi-criteria evaluation'
  },
  
  // ==========================================================================
  // SYNTHESIS TASKS - Gemini for generation, OpenAI for formatting
  // ==========================================================================
  
  brand_synthesis: {
    primary: { provider: 'gemini', model: 'gemini-1.5-pro' },
    fallback: { provider: 'openai', model: 'gpt-4o' },
    rationale: 'Deep brand understanding, nuanced writing'
  },
  
  audience_synthesis: {
    primary: { provider: 'gemini', model: 'gemini-1.5-pro' },
    fallback: { provider: 'openai', model: 'gpt-4o' },
    rationale: 'Psychology, behavior patterns'
  },
  
  strategy_synthesis: {
    primary: { provider: 'gemini', model: 'gemini-1.5-pro' },
    fallback: { provider: 'openai', model: 'gpt-4o' },
    rationale: 'Strategic thinking, long-term planning'
  },
  
  self_evaluation: {
    primary: { provider: 'openai', model: 'gpt-4o' },
    fallback: { provider: 'gemini', model: 'gemini-1.5-pro' },
    rationale: 'Critical evaluation of own output'
  },
  
  // ==========================================================================
  // QUALITY TASKS - OpenAI for consistency
  // ==========================================================================
  
  quality_review: {
    primary: { provider: 'openai', model: 'gpt-4o' },
    fallback: null,
    rationale: 'Consistent quality standards'
  },
  
  confidentiality_check: {
    primary: { provider: 'openai', model: 'gpt-4o-mini' },
    fallback: null,
    rationale: 'Fast, reliable classification'
  },
  
  // ==========================================================================
  // OUTPUT FORMATTING - OpenAI for structure
  // ==========================================================================
  
  json_formatting: {
    primary: { provider: 'openai', model: 'gpt-4o-mini' },
    fallback: null,
    rationale: 'Best at structured output'
  },
  
  pdf_content_formatting: {
    primary: { provider: 'openai', model: 'gpt-4o-mini' },
    fallback: null,
    rationale: 'Consistent formatting'
  },
  
  telegram_briefing: {
    primary: { provider: 'gemini', model: 'gemini-1.5-flash' },
    fallback: { provider: 'openai', model: 'gpt-4o-mini' },
    rationale: 'Conversational, concise'
  },
  
  // ==========================================================================
  // EMBEDDINGS - OpenAI only
  // ==========================================================================
  
  embeddings: {
    primary: { provider: 'openai', model: 'text-embedding-3-small' },
    fallback: null,
    rationale: 'Best embedding quality/cost ratio'
  }
};
```

### Cost Optimization Rules

```typescript
const COST_RULES = {
  // Use cheaper models for:
  cheapModelTasks: [
    'classification',
    'json_formatting',
    'claim_extraction',
    'pattern_matching',
    'credibility_scoring'
  ],
  
  // Use expensive models only for:
  expensiveModelTasks: [
    'brand_synthesis',
    'audience_synthesis', 
    'strategy_synthesis',
    'quality_review',
    'claim_verification'
  ],
  
  // Caching strategy
  caching: {
    embeddings: { ttl: '7d', key: 'content_hash' },
    extraction: { ttl: '24h', key: 'url_hash' },
    synthesis: { ttl: '0', key: null }, // Never cache synthesis
    review: { ttl: '0', key: null }
  },
  
  // Batch when possible
  batching: {
    embeddings: { maxBatchSize: 100, maxWaitMs: 1000 },
    classification: { maxBatchSize: 20, maxWaitMs: 500 }
  }
};
```

---

## 6. Biggest Weaknesses in Current Architecture

### Critical Issues

| # | Weakness | Impact | Root Cause |
|---|----------|--------|------------|
| 1 | **Single-pass research** | Generic outputs, missing context | No research loops or follow-up queries |
| 2 | **No claim-level citations** | Cannot verify specific statements | Evidence collected but not linked to output text |
| 3 | **Fixed query templates** | Misses relevant sources | Not using LLM to generate contextual queries |
| 4 | **No confidence-based routing** | Low-quality outputs proceed | Pipeline is linear, no quality gates |
| 5 | **No iterative refinement** | First draft is final draft | Agents do not self-evaluate |

### Significant Issues

| # | Weakness | Impact | Root Cause |
|---|----------|--------|------------|
| 6 | **No fact classification** | User facts mixed with inferences | No metadata distinguishing fact types |
| 7 | **No source credibility model** | Low-quality sources weighted equally | Only domain heuristics, no learned scoring |
| 8 | **Sequential agent execution** | Slow pipeline, no parallelism | Orchestrator runs agents one-by-one |
| 9 | **No prompt versioning** | Cannot A/B test or rollback | Prompts hardcoded in source |
| 10 | **Lost research provenance** | Cannot debug bad outputs | Query -> source -> claim chain not tracked |

### Moderate Issues

| # | Weakness | Impact | Root Cause |
|---|----------|--------|------------|
| 11 | **No vector search** | Cannot find semantically similar content | Embeddings not stored in Postgres |
| 12 | **No contradiction detection** | Conflicting evidence passes through | No cross-reference verification |
| 13 | **No learning from outcomes** | Same mistakes repeated | No feedback loop from accepted/rejected |
| 14 | **Memory-based context** | Pipeline state lost on restart | activeContexts Map not persisted |
| 15 | **Single delivery channel** | Telegram only | No email, webhook, or API delivery |

---

## 7. Top 10 Upgrades for Intelligence Quality

### Ranked by Impact

| Rank | Upgrade | Expected Impact | Effort |
|------|---------|-----------------|--------|
| 1 | **LLM-Generated Query Planning** | +40% research relevance | Medium |
| 2 | **Claim-Level Citation Tracking** | +35% credibility | Medium |
| 3 | **Confidence-Based Re-Research Loop** | +30% output quality | High |
| 4 | **Agent Self-Reflection** | +25% output quality | Medium |
| 5 | **Multi-Hop Research** | +25% coverage | High |
| 6 | **Fact Classification System** | +20% trust | Low |
| 7 | **Source Credibility Learning** | +20% evidence quality | Medium |
| 8 | **Parallel Agent Execution** | +50% speed | Medium |
| 9 | **Vector Search for Similar Content** | +15% context | Medium |
| 10 | **Quality Gates with Rejection** | +15% consistency | Low |

### Detailed Upgrade Specifications

#### 1. LLM-Generated Query Planning

**Current:** Fixed templates like `"{business_name} competitors {industry}"`

**Upgrade:**
```typescript
async function generateResearchQueries(context: ResearchContext): Promise<Query[]> {
  const prompt = `
    Given this tenant profile and research goals, generate 5-10 search queries
    that will find the most strategically relevant information.
    
    Profile: ${JSON.stringify(context.profile)}
    Research Goal: ${context.goal}
    Already Found: ${context.existingFindings.map(f => f.topic).join(', ')}
    
    Generate queries that:
    1. Target specific, verifiable facts
    2. Explore different angles (competitors, audience, trends)
    3. Avoid generic or obvious searches
    4. Include queries to verify existing assumptions
    
    Return as JSON array with query text and expected finding type.
  `;
  
  return await llm.structuredOutput(prompt, QueryArraySchema);
}
```

#### 2. Claim-Level Citation Tracking

**Current:** Evidence bundles exist but are not linked to specific output sentences.

**Upgrade:**
```typescript
interface GroundedParagraph {
  text: string;
  claims: {
    claimText: string;
    startIndex: number;
    endIndex: number;
    citations: {
      sourceId: string;
      quote: string;
      confidence: number;
    }[];
    factType: 'user_provided' | 'researched' | 'inferred';
  }[];
}

// During synthesis, LLM marks citations inline
const synthesisPrompt = `
  Write the brand positioning statement. For each factual claim,
  cite the source using [SOURCE_ID] format. Mark inferences with [INFERRED].
  
  Example: "The company serves 10,000 customers [SRC_123] across 5 industries [INFERRED]."
`;
```

#### 3. Confidence-Based Re-Research Loop

**Upgrade:**
```typescript
class ConfidenceRouter {
  async routeByConfidence(
    stage: PipelineStage,
    result: StageResult
  ): Promise<NextAction> {
    const confidence = this.calculateOverallConfidence(result);
    
    if (confidence >= 0.85) {
      return { action: 'proceed', nextStage: stage.next };
    }
    
    if (confidence >= 0.65) {
      const gaps = this.identifyGaps(result);
      return { 
        action: 'targeted_research',
        gaps,
        maxAttempts: 2
      };
    }
    
    if (confidence >= 0.45) {
      return {
        action: 'full_re_research',
        reason: 'Insufficient evidence',
        maxAttempts: 1
      };
    }
    
    return {
      action: 'human_review_required',
      reason: 'Cannot achieve confidence threshold'
    };
  }
}
```

#### 4. Agent Self-Reflection

**Upgrade:**
```typescript
class ReflectiveBrandAgent extends ReflectiveAgent<BrandInput, BrandBlueprint> {
  async selfEvaluate(output: BrandBlueprint): Promise<SelfEvaluation> {
    const prompt = `
      Review this brand blueprint you just generated:
      ${JSON.stringify(output)}
      
      Evaluate on:
      1. Evidence grounding: Is every claim supported?
      2. Specificity: Are statements specific to this brand, not generic?
      3. Coherence: Do all elements work together?
      4. Differentiation: Does it distinguish from competitors?
      5. Actionability: Can this guide real decisions?
      
      Score each 1-10. Identify specific improvements needed.
      Return structured evaluation.
    `;
    
    return await this.llm.structuredOutput(prompt, SelfEvaluationSchema);
  }
  
  async planImprovements(evaluation: SelfEvaluation): Promise<ImprovementPlan> {
    const weakAreas = evaluation.scores
      .filter(s => s.score < 7)
      .map(s => s.criterion);
    
    const prompt = `
      The brand blueprint scored low on: ${weakAreas.join(', ')}
      
      Based on the available evidence:
      ${JSON.stringify(this.context.evidence)}
      
      Create a specific improvement plan:
      1. What additional research is needed?
      2. What sections need rewriting?
      3. What generic language should be made specific?
    `;
    
    return await this.llm.structuredOutput(prompt, ImprovementPlanSchema);
  }
}
```

---

## 8. Implementation Order (Highest Leverage First)

### Phase 1: Quick Wins (Weeks 1-2)

| Order | Task | Leverage | Why First |
|-------|------|----------|-----------|
| 1.1 | Fact classification system | High | Low effort, immediate trust improvement |
| 1.2 | Quality gates with rejection | High | Prevents bad outputs from shipping |
| 1.3 | Prompt template system | Medium | Foundation for all other improvements |
| 1.4 | Research session tracking | Medium | Needed for provenance |

### Phase 2: Research Engine (Weeks 3-5)

| Order | Task | Leverage | Why Second |
|-------|------|----------|------------|
| 2.1 | LLM-generated query planning | Very High | Biggest single improvement |
| 2.2 | Claim extraction and linking | Very High | Required for citations |
| 2.3 | Citation tracking in outputs | Very High | Credibility improvement |
| 2.4 | Source credibility scoring | High | Evidence quality |
| 2.5 | Multi-hop research capability | High | Coverage improvement |

### Phase 3: Reasoning Upgrade (Weeks 6-8)

| Order | Task | Leverage | Why Third |
|-------|------|----------|-----------|
| 3.1 | Confidence-based routing | Very High | Quality assurance |
| 3.2 | Agent self-reflection | Very High | Output quality |
| 3.3 | Contradiction detection | High | Evidence integrity |
| 3.4 | pgvector integration | Medium | Semantic search |

### Phase 4: Speed and Scale (Weeks 9-11)

| Order | Task | Leverage | Why Fourth |
|-------|------|----------|------------|
| 4.1 | Parallel agent execution | High | 2x speed improvement |
| 4.2 | Pipeline checkpointing | Medium | Reliability |
| 4.3 | Embedding caching | Medium | Cost reduction |
| 4.4 | Batch processing | Medium | Efficiency |

### Phase 5: Learning System (Weeks 12-14)

| Order | Task | Leverage | Why Fifth |
|-------|------|----------|-----------|
| 5.1 | Outcome tracking | High | Foundation for learning |
| 5.2 | Pattern extraction | High | Continuous improvement |
| 5.3 | Source quality signals | Medium | Better recommendations |
| 5.4 | Global insights | Medium | Platform-wide learning |

### Phase 6: Production Polish (Weeks 15-18)

| Order | Task | Leverage | Why Last |
|-------|------|----------|----------|
| 6.1 | Observability (tracing, metrics) | Medium | Debugging, monitoring |
| 6.2 | A/B testing for prompts | Medium | Optimization |
| 6.3 | Multi-channel delivery | Low | Feature expansion |
| 6.4 | Deliverable versioning UI | Low | User experience |

---

## Appendix A: Fact Classification Schema

```typescript
enum FactType {
  // User explicitly stated this
  USER_PROVIDED = 'user_provided',
  
  // Found in research with high confidence
  RESEARCHED_VERIFIED = 'researched_verified',
  
  // Found in research but not cross-verified
  RESEARCHED_UNVERIFIED = 'researched_unverified',
  
  // Inferred from evidence but not directly stated
  INFERRED_HIGH_CONFIDENCE = 'inferred_high',
  
  // Inferred with uncertainty
  INFERRED_LOW_CONFIDENCE = 'inferred_low',
  
  // Best practice or framework application
  FRAMEWORK_DERIVED = 'framework_derived',
  
  // Assumption that should be validated
  ASSUMPTION = 'assumption'
}

interface ClassifiedFact {
  statement: string;
  factType: FactType;
  confidence: number;
  sources: string[]; // empty for user_provided and inferred
  needsVerification: boolean;
  assumptions: string[]; // what this fact depends on
}
```

## Appendix B: Confidentiality Rules

```typescript
const CONFIDENTIALITY_RULES = {
  // Never share across tenants
  neverShare: [
    'business_name',
    'founder_names',
    'employee_names',
    'client_names',
    'revenue_figures',
    'customer_counts',
    'internal_processes',
    'proprietary_methods',
    'unreleased_products',
    'strategic_plans'
  ],
  
  // Can share if anonymized
  shareAnonymized: [
    'industry_category',
    'company_size_bucket',
    'target_audience_category',
    'platform_focus',
    'content_type_distribution'
  ],
  
  // Safe to share globally
  shareGlobally: [
    'quality_patterns',
    'failure_patterns',
    'framework_effectiveness',
    'source_credibility_signals',
    'aggregated_benchmarks'
  ],
  
  // Anonymization rules
  anonymization: {
    'business_name': 'replace_with_category', // "Tech Startup A"
    'revenue': 'bucket', // "$1M-$10M"
    'employee_count': 'bucket', // "10-50"
    'location': 'region_only', // "North America"
    'dates': 'relative' // "6 months ago"
  }
};
```

## Appendix C: Quality Gate Definitions

```typescript
const QUALITY_GATES = {
  research_complete: {
    minSources: 5,
    minClaims: 10,
    maxGapsAllowed: 2,
    minAverageCredibility: 0.6
  },
  
  evidence_sufficient: {
    minCitationsPerSection: 2,
    minOverallConfidence: 0.7,
    maxUnverifiedClaims: 3,
    maxConflicts: 1
  },
  
  synthesis_quality: {
    minSpecificityScore: 0.7, // not generic
    minCoherenceScore: 0.8, // internally consistent
    minDifferentiationScore: 0.6, // unique to tenant
    maxGenericPhrases: 3
  },
  
  review_passed: {
    minQualityScore: 0.75,
    maxCriticalIssues: 0,
    maxMajorIssues: 2,
    confidentialityPassed: true
  }
};
```

---

## Summary

KORA Core Intelligence v2 is designed as a **research system**, not a content generator. Every output is:

1. **Grounded in evidence** with traceable citations
2. **Classified by fact type** (user, researched, inferred)
3. **Gated by confidence** with re-research loops
4. **Reviewed for quality** before delivery
5. **Isolated by tenant** with strict confidentiality
6. **Improved over time** through anonymized learning

The key mindset shift: KORA should be able to explain WHY it made every statement, WHAT evidence supports it, and HOW confident it is. If it cannot, it should research more or acknowledge the gap.
