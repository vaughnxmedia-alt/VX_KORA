-- Goal-driven Content Strategy: extend content_plans and content_plan_items (marketing funnel outline).

ALTER TABLE public.content_plans
  ADD COLUMN IF NOT EXISTS workspace_label TEXT,
  ADD COLUMN IF NOT EXISTS primary_goal TEXT NOT NULL DEFAULT 'more_views',
  ADD COLUMN IF NOT EXISTS secondary_goal TEXT,
  ADD COLUMN IF NOT EXISTS funnel_focus TEXT NOT NULL DEFAULT 'full_funnel',
  ADD COLUMN IF NOT EXISTS timeframe_days INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS strategy_window_start DATE,
  ADD COLUMN IF NOT EXISTS strategy_window_end DATE,
  ADD COLUMN IF NOT EXISTS required_item_count INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS tone_direction TEXT,
  ADD COLUMN IF NOT EXISTS messaging_direction TEXT,
  ADD COLUMN IF NOT EXISTS industry_context TEXT,
  ADD COLUMN IF NOT EXISTS platforms TEXT[];

COMMENT ON TABLE public.content_plans IS 'Content Strategy rows: funnel-focused marketing outline for planned content execution (Creative Hub).';

UPDATE public.content_plans
SET required_item_count = GREATEST(1, timeframe_days);

-- Relaxed goal check allows product to add labels without new migrations when needed.
ALTER TABLE public.content_plans DROP CONSTRAINT IF EXISTS content_plans_primary_goal_check;
ALTER TABLE public.content_plans
  ADD CONSTRAINT content_plans_primary_goal_check CHECK (
    primary_goal IN (
      'more_views',
      'more_followers',
      'more_conversions',
      'more_leads',
      'more_sales',
      'better_engagement',
      'better_brand_awareness',
      'stronger_retention'
    )
  );

ALTER TABLE public.content_plans DROP CONSTRAINT IF EXISTS content_plans_funnel_focus_check;
ALTER TABLE public.content_plans
  ADD CONSTRAINT content_plans_funnel_focus_check CHECK (
    funnel_focus IN ('awareness', 'awareness_consideration', 'full_funnel')
  );

ALTER TABLE public.content_plans DROP CONSTRAINT IF EXISTS content_plans_secondary_goal_check;
ALTER TABLE public.content_plans
  ADD CONSTRAINT content_plans_secondary_goal_check CHECK (
    secondary_goal IS NULL OR secondary_goal IN (
      'more_views',
      'more_followers',
      'more_conversions',
      'more_leads',
      'more_sales',
      'better_engagement',
      'better_brand_awareness',
      'stronger_retention'
    )
  );

ALTER TABLE public.content_plan_items
  ADD COLUMN IF NOT EXISTS funnel_stage TEXT,
  ADD COLUMN IF NOT EXISTS goal_alignment TEXT,
  ADD COLUMN IF NOT EXISTS tone_note TEXT,
  ADD COLUMN IF NOT EXISTS event_context TEXT;
