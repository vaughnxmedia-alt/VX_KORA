-- Map legacy funnel_focus values to AIDA + Recap stage model before tightening CHECK.

UPDATE public.content_plans
SET funnel_focus = CASE funnel_focus
  WHEN 'awareness_consideration' THEN 'interest'
  ELSE funnel_focus
END
WHERE funnel_focus IN ('awareness_consideration');

ALTER TABLE public.content_plans DROP CONSTRAINT IF EXISTS content_plans_funnel_focus_check;

ALTER TABLE public.content_plans
  ADD CONSTRAINT content_plans_funnel_focus_check CHECK (
    funnel_focus IN (
      'awareness',
      'interest',
      'desire',
      'action',
      'recap',
      'full_funnel'
    )
  );

COMMENT ON COLUMN public.content_plans.funnel_focus IS 'Primary funnel stage emphasis: Awareness, Interest, Desire, Action, Recap, or full_funnel for all five stages (paid and organic).';
