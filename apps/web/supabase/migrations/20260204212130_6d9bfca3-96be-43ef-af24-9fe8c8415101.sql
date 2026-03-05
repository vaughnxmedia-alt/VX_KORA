-- Create support_messages table for storing contact form submissions
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert support messages (public contact form)
CREATE POLICY "Anyone can submit support messages"
ON public.support_messages
FOR INSERT
WITH CHECK (true);

-- Only admins can view support messages
CREATE POLICY "Admins can view all support messages"
ON public.support_messages
FOR SELECT
USING (get_user_role(auth.uid()) = 'admin'::text);

-- Only admins can update support messages (change status)
CREATE POLICY "Admins can update support messages"
ON public.support_messages
FOR UPDATE
USING (get_user_role(auth.uid()) = 'admin'::text);

-- Only admins can delete support messages
CREATE POLICY "Admins can delete support messages"
ON public.support_messages
FOR DELETE
USING (get_user_role(auth.uid()) = 'admin'::text);