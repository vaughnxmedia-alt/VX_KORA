-- Allow anyone to subscribe (insert only)
CREATE POLICY "Anyone can subscribe"
ON public.subscribers
FOR INSERT
WITH CHECK (true);