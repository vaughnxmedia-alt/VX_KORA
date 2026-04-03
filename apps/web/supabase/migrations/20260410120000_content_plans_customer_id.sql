-- Link content strategies to a CRM client (replaces free-text workspace label in product flows).

ALTER TABLE public.content_plans
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS content_plans_customer_id_idx ON public.content_plans(customer_id);

COMMENT ON COLUMN public.content_plans.customer_id IS 'Optional CRM client this strategy is for.';
