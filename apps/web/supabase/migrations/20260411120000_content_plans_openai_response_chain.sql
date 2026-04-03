-- Persist OpenAI Responses API chain id per content plan (previous_response_id continuity).
ALTER TABLE public.content_plans
  ADD COLUMN IF NOT EXISTS openai_response_chain_id TEXT;

COMMENT ON COLUMN public.content_plans.openai_response_chain_id IS
  'Latest OpenAI response id for Creative Hub chat (Responses API with store + previous_response_id).';
