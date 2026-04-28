CREATE TABLE IF NOT EXISTS public.audit_industry_inspiration_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  creative_direction TEXT NOT NULL,
  visual_cues TEXT[] NOT NULL DEFAULT '{}',
  avoid_rules TEXT[] NOT NULL DEFAULT '{}',
  tone_keywords TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_industry_profiles_active_idx
  ON public.audit_industry_inspiration_profiles (is_active, label);

DROP TRIGGER IF EXISTS trg_audit_industry_profiles_updated_at
  ON public.audit_industry_inspiration_profiles;

CREATE TRIGGER trg_audit_industry_profiles_updated_at
BEFORE UPDATE ON public.audit_industry_inspiration_profiles
FOR EACH ROW EXECUTE FUNCTION public.lls_set_updated_at();

ALTER TABLE public.audit_industry_inspiration_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dashboard staff manage audit industry inspiration profiles"
  ON public.audit_industry_inspiration_profiles;

CREATE POLICY "Dashboard staff manage audit industry inspiration profiles"
ON public.audit_industry_inspiration_profiles FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

DROP POLICY IF EXISTS "Authenticated read audit industry inspiration profiles"
  ON public.audit_industry_inspiration_profiles;

CREATE POLICY "Authenticated read audit industry inspiration profiles"
ON public.audit_industry_inspiration_profiles FOR SELECT TO authenticated
USING (is_active = true);

CREATE TABLE IF NOT EXISTS public.audit_aesthetic_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES public.free_audits(id) ON DELETE CASCADE,
  lead_key TEXT NOT NULL,
  detected_industry TEXT,
  detected_aesthetic TEXT,
  recommended_vibe TEXT,
  confidence NUMERIC NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 1),
  source_urls TEXT[] NOT NULL DEFAULT '{}',
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (audit_id)
);

CREATE INDEX IF NOT EXISTS audit_aesthetic_signals_industry_idx
  ON public.audit_aesthetic_signals (detected_industry, confidence DESC);

ALTER TABLE public.audit_aesthetic_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dashboard staff manage audit aesthetic signals"
  ON public.audit_aesthetic_signals;

CREATE POLICY "Dashboard staff manage audit aesthetic signals"
ON public.audit_aesthetic_signals FOR ALL TO authenticated
USING (public.is_dashboard_operator(auth.uid()))
WITH CHECK (public.is_dashboard_operator(auth.uid()));

INSERT INTO public.audit_industry_inspiration_profiles
  (industry_key, label, creative_direction, visual_cues, avoid_rules, tone_keywords)
VALUES
  (
    'beauty_wellness',
    'Beauty / Wellness',
    'Luxury editorial wellness report, soft off-white spacing, controlled gold accents, calm authority, refined minimal photography-adjacent geometry.',
    ARRAY['soft negative space', 'warm gold rules', 'elegant editorial crop', 'calm hierarchy'],
    ARRAY['spa clipart', 'pink Canva template', 'overly feminine stock look'],
    ARRAY['calm', 'premium', 'trust', 'refined']
  ),
  (
    'law_professional',
    'Law / Professional Services',
    'Authoritative institutional brand audit, strong navy blocks, precise grid, structured hierarchy, premium legal dossier energy.',
    ARRAY['navy panels', 'structured columns', 'thin gold divider lines', 'formal negative space'],
    ARRAY['scales icons', 'courthouse clipart', 'generic corporate blue gradients'],
    ARRAY['credible', 'precise', 'authoritative', 'disciplined']
  ),
  (
    'real_estate',
    'Real Estate',
    'Modern luxury property strategy deck, architectural grid, clean spatial framing, navy-and-gold editorial market report feeling.',
    ARRAY['architectural spacing', 'floorplan geometry', 'market report layout', 'premium serif scale'],
    ARRAY['house icons', 'key clipart', 'cheap luxury gradients'],
    ARRAY['elevated', 'local authority', 'clean', 'market-savvy']
  ),
  (
    'music_entertainment',
    'Music / Entertainment',
    'Cinematic cultural strategy visual, bold contrast, abstract rhythm, editorial tension, refined energy without cartoon graphics.',
    ARRAY['cinematic contrast', 'rhythmic geometry', 'bold title scale', 'A24-style restraint'],
    ARRAY['music note icons', 'neon club template', 'album cover parody'],
    ARRAY['cultural', 'bold', 'controlled', 'memorable']
  ),
  (
    'coaching_consulting',
    'Coaching / Consulting',
    'Premium strategy advisory deck, centered clarity, confident hierarchy, abstract transformation path, refined consultancy energy.',
    ARRAY['center alignment', 'strategy memo spacing', 'transformation line', 'clean blocks'],
    ARRAY['motivational poster look', 'generic success icons', 'startup SaaS dashboard'],
    ARRAY['clear', 'strategic', 'trusted', 'focused']
  ),
  (
    'restaurant_hospitality',
    'Restaurant / Hospitality',
    'Editorial hospitality diagnosis, tactile menu-inspired spacing, rich neutral warmth, gold accent rules, premium but approachable.',
    ARRAY['menu grid', 'warm neutral panels', 'tasteful contrast', 'inviting editorial rhythm'],
    ARRAY['fork icons', 'food clipart', 'busy flyer layout'],
    ARRAY['warm', 'inviting', 'elevated', 'memorable']
  ),
  (
    'nonprofit_community',
    'Nonprofit / Community',
    'Credibility-focused community impact report, structured trust, human-centered restraint, clear hierarchy, calm authority.',
    ARRAY['impact report grid', 'trust-building structure', 'calm hierarchy', 'balanced margins'],
    ARRAY['hands/heart clipart', 'generic charity poster', 'overly sentimental visuals'],
    ARRAY['trust', 'impact', 'clarity', 'community']
  ),
  (
    'default_brand',
    'General Brand / Founder',
    'Premium editorial brand strategy visual, strong navy anchor, off-white space, subtle gold intervention, modern diagnosis artifact.',
    ARRAY['navy anchor shape', 'off-white negative space', 'gold intervention line', 'editorial hierarchy'],
    ARRAY['generic marketing icons', 'Canva template look', 'bright startup gradients'],
    ARRAY['premium', 'strategic', 'clear', 'authoritative']
  )
ON CONFLICT (industry_key) DO UPDATE
SET
  label = EXCLUDED.label,
  creative_direction = EXCLUDED.creative_direction,
  visual_cues = EXCLUDED.visual_cues,
  avoid_rules = EXCLUDED.avoid_rules,
  tone_keywords = EXCLUDED.tone_keywords,
  is_active = true,
  updated_at = now();
