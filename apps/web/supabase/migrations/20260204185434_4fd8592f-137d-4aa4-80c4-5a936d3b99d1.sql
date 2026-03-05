-- Create meetings table
CREATE TABLE public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    meeting_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Admin can manage all meetings
CREATE POLICY "Admins can manage all meetings"
ON public.meetings
FOR ALL
USING (get_user_role(auth.uid()) = 'admin')
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Users can view their own meetings (via customer_id)
CREATE POLICY "Users can view their own meetings"
ON public.meetings
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.customers
    WHERE customers.id = meetings.customer_id
    AND customers.user_id = auth.uid()
));