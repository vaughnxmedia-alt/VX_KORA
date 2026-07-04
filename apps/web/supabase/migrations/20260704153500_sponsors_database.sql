-- Internal admin-only sponsorship partner tracking for JahKnowsPR Firm clients and events.

CREATE TABLE public.sponsors_database (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  industry TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  location TEXT,
  interest_level TEXT NOT NULL DEFAULT 'medium'
    CHECK (interest_level IN ('high', 'medium', 'low')),
  best_fit_for TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'not_contacted'
    CHECK (status IN (
      'not_contacted',
      'contacted',
      'interested',
      'follow_up_needed',
      'declined',
      'sponsored'
    )),
  last_contact_date DATE,
  next_follow_up_date DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sponsors_database_status_idx ON public.sponsors_database (status);
CREATE INDEX sponsors_database_interest_level_idx ON public.sponsors_database (interest_level);
CREATE INDEX sponsors_database_industry_idx ON public.sponsors_database (industry);
CREATE INDEX sponsors_database_location_idx ON public.sponsors_database (location);
CREATE INDEX sponsors_database_business_name_idx ON public.sponsors_database (business_name);

ALTER TABLE public.sponsors_database ENABLE ROW LEVEL SECURITY;

-- Admin-only: no public read/write policies.
CREATE POLICY "Admins can manage sponsors_database"
ON public.sponsors_database
FOR ALL
TO authenticated
USING (public.get_user_role(auth.uid()) = 'admin')
WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

CREATE TRIGGER update_sponsors_database_updated_at
BEFORE UPDATE ON public.sponsors_database
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.sponsors_database IS
  'Internal JahKnowsPR Firm sponsorship partner CRM. Admin-only via RLS; not exposed on public site.';
