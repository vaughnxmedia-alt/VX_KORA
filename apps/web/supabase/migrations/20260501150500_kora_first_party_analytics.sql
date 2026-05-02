-- KORA first-party analytics (JahKnowsPR + Mission Control)
-- Privacy-first event collection and reporting tables.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_name text not null,
  site_id text not null,
  brand_id text not null,
  page_path text,
  page_title text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  content_id text,
  content_type text,
  content_category text,
  blog_slug text,
  campaign_id text,
  offer_id text,
  funnel_id text,
  funnel_step text,
  cta_id text,
  cta_label text,
  button_text text,
  form_id text,
  form_name text,
  video_id text,
  revenue_value numeric(12,2) default 0,
  currency text,
  anonymous_visitor_id text not null,
  session_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  device_type text,
  browser text,
  country_or_region text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name);
create index if not exists analytics_events_page_path_idx on public.analytics_events (page_path);
create index if not exists analytics_events_blog_slug_idx on public.analytics_events (blog_slug);
create index if not exists analytics_events_offer_id_idx on public.analytics_events (offer_id);
create index if not exists analytics_events_funnel_idx on public.analytics_events (funnel_id, funnel_step);
create index if not exists analytics_events_campaign_id_idx on public.analytics_events (campaign_id);
create index if not exists analytics_events_session_idx on public.analytics_events (session_id);
create index if not exists analytics_events_visitor_idx on public.analytics_events (anonymous_visitor_id);

create table if not exists public.analytics_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  site_id text not null,
  brand_id text not null,
  anonymous_visitor_id text not null,
  session_id text not null unique,
  first_page_path text,
  last_page_path text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text,
  browser text,
  event_count integer not null default 0,
  page_view_count integer not null default 0,
  cta_click_count integer not null default 0,
  conversion_count integer not null default 0,
  revenue_value numeric(12,2) not null default 0,
  duration_seconds integer not null default 0
);

create index if not exists analytics_sessions_visitor_idx on public.analytics_sessions (anonymous_visitor_id, created_at desc);
create index if not exists analytics_sessions_site_brand_idx on public.analytics_sessions (site_id, brand_id, created_at desc);

create table if not exists public.analytics_daily_rollups (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  site_id text not null,
  brand_id text not null,
  page_views integer not null default 0,
  unique_visitors integer not null default 0,
  sessions integer not null default 0,
  cta_clicks integer not null default 0,
  form_starts integer not null default 0,
  form_submits integer not null default 0,
  booking_clicks integer not null default 0,
  checkout_starts integer not null default 0,
  purchases integer not null default 0,
  revenue numeric(12,2) not null default 0,
  conversion_rate numeric(8,4) not null default 0,
  top_page_path text,
  top_offer_id text,
  top_campaign_id text,
  metadata jsonb not null default '{}'::jsonb,
  unique (date, site_id, brand_id)
);

create index if not exists analytics_daily_rollups_date_idx on public.analytics_daily_rollups (date desc);

create table if not exists public.content_performance (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  site_id text not null,
  brand_id text not null,
  content_id text,
  content_type text,
  title text,
  slug text,
  page_path text,
  category text,
  views integer not null default 0,
  unique_visitors integer not null default 0,
  clicks integer not null default 0,
  click_rate numeric(8,4) not null default 0,
  avg_engagement_time numeric(12,2) not null default 0,
  form_submits integer not null default 0,
  booking_clicks integer not null default 0,
  revenue_attributed numeric(12,2) not null default 0,
  conversion_rate numeric(8,4) not null default 0,
  seo_status text,
  backlink_status text,
  recommended_action text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists content_performance_views_idx on public.content_performance (views desc);
create index if not exists content_performance_page_idx on public.content_performance (page_path);
create index if not exists content_performance_slug_idx on public.content_performance (slug);
create unique index if not exists content_performance_unique_idx
on public.content_performance (site_id, brand_id, content_id, page_path, slug);

create table if not exists public.funnel_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  site_id text not null,
  brand_id text not null,
  funnel_id text not null,
  funnel_name text not null,
  date_range_start date not null,
  date_range_end date not null,
  total_entries integer not null default 0,
  total_conversions integer not null default 0,
  conversion_rate numeric(8,4) not null default 0,
  largest_dropoff_step text,
  largest_dropoff_rate numeric(8,4) not null default 0,
  revenue numeric(12,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  unique (site_id, brand_id, funnel_id, date_range_start, date_range_end)
);

create table if not exists public.funnel_steps (
  id uuid primary key default gen_random_uuid(),
  funnel_report_id uuid not null references public.funnel_reports(id) on delete cascade,
  step_order integer not null,
  step_name text not null,
  event_name text not null,
  page_path text,
  visitors integer not null default 0,
  completed integer not null default 0,
  dropoff_count integer not null default 0,
  dropoff_rate numeric(8,4) not null default 0,
  conversion_rate numeric(8,4) not null default 0
);

create index if not exists funnel_steps_report_idx on public.funnel_steps (funnel_report_id, step_order);

create table if not exists public.revenue_attribution (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  site_id text not null,
  brand_id text not null,
  order_id text,
  payment_provider text,
  offer_id text,
  offer_name text,
  amount numeric(12,2) not null default 0,
  currency text,
  page_path text,
  campaign_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  anonymous_visitor_id text,
  session_id text,
  user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists revenue_attribution_created_idx on public.revenue_attribution (created_at desc);
create index if not exists revenue_attribution_offer_idx on public.revenue_attribution (offer_id);

create table if not exists public.kora_analytics_findings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  site_id text not null,
  brand_id text not null,
  source_type text not null,
  finding_type text not null,
  title text not null,
  summary text not null,
  evidence jsonb not null default '{}'::jsonb,
  recommendation text not null,
  priority text not null default 'medium',
  status text not null default 'new',
  related_page_path text,
  related_content_id text,
  related_offer_id text,
  related_campaign_id text,
  model_used text,
  date_range_start date,
  date_range_end date,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists kora_analytics_findings_priority_idx on public.kora_analytics_findings (priority, created_at desc);
create index if not exists kora_analytics_findings_status_idx on public.kora_analytics_findings (status, created_at desc);

alter table public.analytics_events enable row level security;
alter table public.analytics_sessions enable row level security;
alter table public.analytics_daily_rollups enable row level security;
alter table public.content_performance enable row level security;
alter table public.funnel_reports enable row level security;
alter table public.funnel_steps enable row level security;
alter table public.revenue_attribution enable row level security;
alter table public.kora_analytics_findings enable row level security;

drop policy if exists "analytics_events_service_role_all" on public.analytics_events;
create policy "analytics_events_service_role_all"
on public.analytics_events
for all
to service_role
using (true)
with check (true);

drop policy if exists "analytics_sessions_service_role_all" on public.analytics_sessions;
create policy "analytics_sessions_service_role_all"
on public.analytics_sessions
for all
to service_role
using (true)
with check (true);

drop policy if exists "analytics_daily_rollups_service_role_all" on public.analytics_daily_rollups;
create policy "analytics_daily_rollups_service_role_all"
on public.analytics_daily_rollups
for all
to service_role
using (true)
with check (true);

drop policy if exists "content_performance_service_role_all" on public.content_performance;
create policy "content_performance_service_role_all"
on public.content_performance
for all
to service_role
using (true)
with check (true);

drop policy if exists "funnel_reports_service_role_all" on public.funnel_reports;
create policy "funnel_reports_service_role_all"
on public.funnel_reports
for all
to service_role
using (true)
with check (true);

drop policy if exists "funnel_steps_service_role_all" on public.funnel_steps;
create policy "funnel_steps_service_role_all"
on public.funnel_steps
for all
to service_role
using (true)
with check (true);

drop policy if exists "revenue_attribution_service_role_all" on public.revenue_attribution;
create policy "revenue_attribution_service_role_all"
on public.revenue_attribution
for all
to service_role
using (true)
with check (true);

drop policy if exists "kora_analytics_findings_service_role_all" on public.kora_analytics_findings;
create policy "kora_analytics_findings_service_role_all"
on public.kora_analytics_findings
for all
to service_role
using (true)
with check (true);

drop policy if exists "analytics_events_admin_read" on public.analytics_events;
create policy "analytics_events_admin_read"
on public.analytics_events
for select
to authenticated
using (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'admin'
));

drop policy if exists "analytics_sessions_admin_read" on public.analytics_sessions;
create policy "analytics_sessions_admin_read"
on public.analytics_sessions
for select
to authenticated
using (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'admin'
));

drop policy if exists "analytics_rollups_admin_read" on public.analytics_daily_rollups;
create policy "analytics_rollups_admin_read"
on public.analytics_daily_rollups
for select
to authenticated
using (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'admin'
));

drop policy if exists "content_performance_admin_read" on public.content_performance;
create policy "content_performance_admin_read"
on public.content_performance
for select
to authenticated
using (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'admin'
));

drop policy if exists "funnel_reports_admin_read" on public.funnel_reports;
create policy "funnel_reports_admin_read"
on public.funnel_reports
for select
to authenticated
using (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'admin'
));

drop policy if exists "funnel_steps_admin_read" on public.funnel_steps;
create policy "funnel_steps_admin_read"
on public.funnel_steps
for select
to authenticated
using (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'admin'
));

drop policy if exists "revenue_attr_admin_read" on public.revenue_attribution;
create policy "revenue_attr_admin_read"
on public.revenue_attribution
for select
to authenticated
using (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'admin'
));

drop policy if exists "kora_findings_admin_read" on public.kora_analytics_findings;
create policy "kora_findings_admin_read"
on public.kora_analytics_findings
for select
to authenticated
using (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'admin'
));

drop policy if exists "kora_findings_admin_update" on public.kora_analytics_findings;
create policy "kora_findings_admin_update"
on public.kora_analytics_findings
for update
to authenticated
using (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'admin'
))
with check (exists (
  select 1
  from public.profiles p
  where p.id = auth.uid()
    and p.role = 'admin'
));
