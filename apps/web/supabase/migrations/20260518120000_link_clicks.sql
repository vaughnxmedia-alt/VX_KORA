-- Lightweight click tracking for the public /links page.
create table if not exists public.link_clicks (
  id uuid primary key default gen_random_uuid(),
  link_id text not null,
  link_label text not null,
  destination_url text not null,
  source_page text not null default '/links',
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists link_clicks_created_at_idx on public.link_clicks (created_at desc);
create index if not exists link_clicks_link_id_idx on public.link_clicks (link_id, created_at desc);

alter table public.link_clicks enable row level security;

drop policy if exists "link_clicks_anon_insert" on public.link_clicks;
create policy "link_clicks_anon_insert"
on public.link_clicks
for insert
to anon, authenticated
with check (true);

drop policy if exists "link_clicks_service_role_all" on public.link_clicks;
create policy "link_clicks_service_role_all"
on public.link_clicks
for all
to service_role
using (true)
with check (true);

drop policy if exists "link_clicks_admin_read" on public.link_clicks;
create policy "link_clicks_admin_read"
on public.link_clicks
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
