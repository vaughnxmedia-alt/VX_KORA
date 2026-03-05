-- Make user_id nullable to allow leads without accounts
ALTER TABLE public.customers 
ALTER COLUMN user_id DROP NOT NULL;

-- Insert Rikayla Ambers as a new lead
INSERT INTO public.customers (first_name, last_name, client_status)
VALUES ('Rikayla', 'Ambers', 'lead_captured');

-- Update RLS policy to allow admins to insert customers without user_id
DROP POLICY IF EXISTS "Admins can insert customers" ON public.customers;

CREATE POLICY "Admins can insert customers"
ON public.customers
FOR INSERT
WITH CHECK (get_user_role(auth.uid()) = 'admin'::text);