-- Drop existing tables to start fresh
DROP TABLE IF EXISTS public."Client Business Info" CASCADE;
DROP TABLE IF EXISTS public."Client Information Personal" CASCADE;

-- Create the customers table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE,
    phone_number TEXT,
    business_name TEXT,
    website_or_social TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the brand_blueprints table
CREATE TABLE public.brand_blueprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    target_audience TEXT,
    problem_statement TEXT,
    brand_personality TEXT,
    brand_gaps TEXT,
    six_month_vision TEXT,
    status TEXT DEFAULT 'draft',
    payment_status TEXT DEFAULT 'pending',
    payment_amount DECIMAL(10,2),
    payment_date TIMESTAMPTZ,
    payment_method TEXT,
    payment_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ
);

-- RLS for customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own customer information"
ON public.customers
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS for brand_blueprints table
ALTER TABLE public.brand_blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own brand blueprints"
ON public.brand_blueprints
FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.customers
    WHERE customers.id = brand_blueprints.customer_id
    AND customers.user_id = auth.uid()
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.customers
    WHERE customers.id = brand_blueprints.customer_id
    AND customers.user_id = auth.uid()
));

-- Add index for payment status queries
CREATE INDEX idx_brand_blueprints_payment_status ON public.brand_blueprints (payment_status);
