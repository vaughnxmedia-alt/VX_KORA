-- Add access_token column to subscribers table
ALTER TABLE public.subscribers
ADD COLUMN access_token TEXT UNIQUE;

-- Generate tokens for existing subscribers
UPDATE public.subscribers
SET access_token = encode(gen_random_bytes(32), 'hex')
WHERE access_token IS NULL;