-- Create content_calendars table to track calendars per client
CREATE TABLE public.content_calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  calendar_type TEXT NOT NULL DEFAULT 'client' CHECK (calendar_type IN ('jahknowspr', 'client')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scheduled_posts table for content calendar posts
CREATE TABLE public.scheduled_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calendar_id UUID NOT NULL REFERENCES public.content_calendars(id) ON DELETE CASCADE,
  caption TEXT,
  platforms TEXT[] NOT NULL DEFAULT '{}',
  platform_settings JSONB DEFAULT '{}',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL DEFAULT '12:00',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'published', 'failed', 'draft')),
  media_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.content_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_calendars
CREATE POLICY "Admins can manage all calendars"
ON public.content_calendars FOR ALL
USING (get_user_role(auth.uid()) = 'admin')
WITH CHECK (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Clients can view their own calendars"
ON public.content_calendars FOR SELECT
USING (EXISTS (
  SELECT 1 FROM customers 
  WHERE customers.id = content_calendars.customer_id 
  AND customers.user_id = auth.uid()
));

-- RLS Policies for scheduled_posts
CREATE POLICY "Admins can manage all posts"
ON public.scheduled_posts FOR ALL
USING (get_user_role(auth.uid()) = 'admin')
WITH CHECK (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Clients can view their own calendar posts"
ON public.scheduled_posts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM content_calendars cc
  JOIN customers c ON c.id = cc.customer_id
  WHERE cc.id = scheduled_posts.calendar_id 
  AND c.user_id = auth.uid()
));

-- Create trigger to update updated_at
CREATE TRIGGER update_content_calendars_updated_at
BEFORE UPDATE ON public.content_calendars
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_posts_updated_at
BEFORE UPDATE ON public.scheduled_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the JahknowsPR internal calendar (no customer_id)
INSERT INTO public.content_calendars (name, calendar_type, customer_id)
VALUES ('JahknowsPR', 'jahknowspr', NULL);

-- Create function to auto-create calendar when a customer is created
CREATE OR REPLACE FUNCTION public.create_customer_calendar()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.content_calendars (customer_id, name, calendar_type)
  VALUES (NEW.id, COALESCE(NEW.business_name, NEW.first_name || ' ' || NEW.last_name), 'client');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create calendar on customer insert
CREATE TRIGGER create_calendar_for_new_customer
AFTER INSERT ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.create_customer_calendar();