-- Strategy Session: Square (and future) payment audit trail + link to meetings

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'square',
  external_payment_id TEXT NOT NULL,
  idempotency_key TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  buyer_email TEXT,
  square_location_id TEXT,
  raw_status TEXT,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_transactions_provider_external_unique UNIQUE (provider, external_payment_id),
  CONSTRAINT payment_transactions_idempotency_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS payment_transactions_meeting_id_idx
  ON public.payment_transactions (meeting_id);

CREATE INDEX IF NOT EXISTS payment_transactions_unlinked_square_idx
  ON public.payment_transactions (external_payment_id)
  WHERE meeting_id IS NULL AND provider = 'square';

COMMENT ON TABLE public.payment_transactions IS
  'Card payments (Square, etc.). Linked to meetings after strategy-session-book completes.';
COMMENT ON COLUMN public.payment_transactions.external_payment_id IS
  'Provider payment id (e.g. Square payment id)';
COMMENT ON COLUMN public.payment_transactions.idempotency_key IS
  'Idempotency key sent to Square; prevents duplicate charges for the same client attempt.';

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS payment_transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS meetings_payment_transaction_id_idx
  ON public.meetings (payment_transaction_id);

COMMENT ON COLUMN public.meetings.payment_transaction_id IS
  'Row in payment_transactions for this booking (set with first successful strategy-session-book after Square charge).';

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Inserts/updates only via service role (Edge). Authenticated admins may read for support.
CREATE POLICY "Admins can select payment_transactions"
  ON public.payment_transactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_transactions TO service_role;
