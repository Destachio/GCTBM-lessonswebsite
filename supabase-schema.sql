-- =============================================================
-- GCTBM Lessons — Supabase schema, RLS, and seed data
-- One-time setup. Paste this whole file into the Supabase SQL Editor.
-- Safe to re-run.
-- =============================================================

-- -------------------------------------------------------------
-- 1. TABLES
-- -------------------------------------------------------------

create table if not exists public.seasons (
  id          text primary key,
  name        text not null,
  start_date  date not null,
  price       numeric(10,2) not null default 350,
  is_current  boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.locations (
  id          text primary key,
  name        text not null,
  address     text not null,
  coach       text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.timeslots (
  id            text primary key,
  season_id     text not null references public.seasons(id)   on delete cascade,
  location_id   text not null references public.locations(id) on delete cascade,
  day_of_week   int  not null check (day_of_week between 0 and 6),
  time_block    text not null,
  level         text not null check (level in ('beginner','intermediate','advanced')),
  max_trainees  int  not null default 7 check (max_trainees > 0),
  lesson_dates  date[] not null default '{}',
  created_at    timestamptz not null default now()
);
create index if not exists timeslots_season_idx   on public.timeslots(season_id);
create index if not exists timeslots_location_idx on public.timeslots(location_id);

create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  timeslot_id  text not null references public.timeslots(id) on delete cascade,
  full_name    text not null,
  email        text not null,
  phone        text not null,
  status       text not null check (status in ('booked','waitlist','cancelled')) default 'booked',
  booked_at    timestamptz not null default now(),
  attendance   jsonb not null default '{}'::jsonb
);
create index if not exists bookings_timeslot_idx on public.bookings(timeslot_id);
create index if not exists bookings_email_idx    on public.bookings(lower(email));
create index if not exists bookings_phone_idx    on public.bookings(regexp_replace(phone, '[^0-9]', '', 'g'));

-- -------------------------------------------------------------
-- 2. ROW-LEVEL SECURITY
-- -------------------------------------------------------------
alter table public.seasons   enable row level security;
alter table public.locations enable row level security;
alter table public.timeslots enable row level security;
alter table public.bookings  enable row level security;

-- Drop existing policies so the script is idempotent
do $$ declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname='public' loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Public can READ reference data (needed for the booking flow UI)
create policy "anon reads seasons"   on public.seasons   for select using (true);
create policy "anon reads locations" on public.locations for select using (true);
create policy "anon reads timeslots" on public.timeslots for select using (true);

-- Bookings personal data: NEVER directly readable. Anon never reads, never writes directly.
-- All anon access goes through RPCs below.
-- Authenticated users (admin) have full access:
create policy "admin reads bookings"   on public.bookings  for select using (auth.role() = 'authenticated');
create policy "admin writes bookings"  on public.bookings  for all    using (auth.role() = 'authenticated');
create policy "admin manages seasons"  on public.seasons   for all    using (auth.role() = 'authenticated');
create policy "admin manages locations" on public.locations for all   using (auth.role() = 'authenticated');
create policy "admin manages timeslots" on public.timeslots for all   using (auth.role() = 'authenticated');

-- -------------------------------------------------------------
-- 3. PUBLIC RPCs (security definer — they bypass RLS but only expose what's safe)
-- -------------------------------------------------------------

-- 3a) Counts per timeslot (no personal data leaks)
create or replace function public.get_timeslot_availability(p_season_id text)
returns table (
  timeslot_id    text,
  booked_count   int,
  waitlist_count int
)
language sql security definer set search_path = public as $$
  select
    t.id,
    coalesce(sum(case when b.status='booked'   then 1 else 0 end)::int, 0),
    coalesce(sum(case when b.status='waitlist' then 1 else 0 end)::int, 0)
  from timeslots t
  left join bookings b on b.timeslot_id = t.id
  where t.season_id = p_season_id
  group by t.id;
$$;
grant execute on function public.get_timeslot_availability(text) to anon, authenticated;

-- 3b) Duplicate-booking detection (returns minimal info needed for the warning modal)
create or replace function public.find_existing_bookings(
  p_email text, p_phone text, p_name text
)
returns table (
  id           uuid,
  timeslot_id  text,
  status       text,
  full_name    text,
  email        text,
  phone        text
)
language sql security definer set search_path = public as $$
  select b.id, b.timeslot_id, b.status, b.full_name, b.email, b.phone
  from bookings b
  where b.status in ('booked','waitlist')
    and (
      (coalesce(p_email,'') <> '' and lower(b.email) = lower(trim(p_email)))
      or (coalesce(p_phone,'') <> '' and regexp_replace(b.phone,'[^0-9]','','g') = regexp_replace(p_phone,'[^0-9]','','g'))
      or (coalesce(p_name,'')  <> '' and lower(trim(b.full_name)) = lower(trim(p_name)))
    );
$$;
grant execute on function public.find_existing_bookings(text,text,text) to anon, authenticated;

-- 3c) Create a booking (anon-callable; validates capacity, can replace prior bookings)
create or replace function public.create_booking(
  p_timeslot_id text,
  p_full_name   text,
  p_email       text,
  p_phone       text,
  p_replace_ids uuid[] default '{}'
)
returns table (booking_id uuid, status text)
language plpgsql security definer set search_path = public as $$
declare
  v_max int; v_booked int; v_status text; v_new_id uuid;
begin
  select max_trainees into v_max from timeslots where id = p_timeslot_id;
  if v_max is null then raise exception 'Timeslot not found'; end if;

  if coalesce(array_length(p_replace_ids,1),0) > 0 then
    update bookings set status='cancelled' where id = any(p_replace_ids);
  end if;

  select count(*) into v_booked from bookings where timeslot_id = p_timeslot_id and status = 'booked';
  v_status := case when v_booked >= v_max then 'waitlist' else 'booked' end;

  insert into bookings (timeslot_id, full_name, email, phone, status)
  values (p_timeslot_id, trim(p_full_name), trim(p_email), trim(p_phone), v_status)
  returning id into v_new_id;

  return query select v_new_id, v_status;
end;
$$;
grant execute on function public.create_booking(text,text,text,text,uuid[]) to anon, authenticated;

-- 3d) Trainee fetches OWN bookings (check-in portal)
create or replace function public.get_my_bookings(p_email text)
returns table (
  id           uuid,
  timeslot_id  text,
  full_name    text,
  status       text,
  attendance   jsonb
)
language sql security definer set search_path = public as $$
  select b.id, b.timeslot_id, b.full_name, b.status, b.attendance
  from bookings b
  where lower(trim(b.email)) = lower(trim(p_email))
    and b.status in ('booked','waitlist');
$$;
grant execute on function public.get_my_bookings(text) to anon, authenticated;

-- 3e) Toggle attendance for a lesson (trainee, scoped by email)
create or replace function public.toggle_attendance(
  p_email text, p_booking_id uuid, p_date date
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_att jsonb; v_owner text;
begin
  select email, attendance into v_owner, v_att from bookings where id = p_booking_id;
  if v_owner is null or lower(trim(v_owner)) <> lower(trim(p_email)) then
    raise exception 'Not authorised';
  end if;
  v_att := coalesce(v_att, '{}'::jsonb);
  v_att := jsonb_set(v_att, array[p_date::text],
                     to_jsonb(not coalesce((v_att->>p_date::text)::boolean, false)));
  update bookings set attendance = v_att where id = p_booking_id;
  return v_att;
end;
$$;
grant execute on function public.toggle_attendance(text,uuid,date) to anon, authenticated;

-- -------------------------------------------------------------
-- 4. SEED DATA (matches the original demo)
-- -------------------------------------------------------------
insert into public.seasons (id, name, start_date, price, is_current) values
  ('summer-2024', 'Summer 2024', '2024-04-01', 350, true),
  ('winter-2024', 'Winter 2024', '2024-10-07', 320, false)
on conflict (id) do nothing;

insert into public.locations (id, name, address, coach) values
  ('tongelreep',  'Tongelreep',  'Charles Roelslaan 15', 'Coach Marco'),
  ('gendersteyn', 'Gendersteyn', 'Locht 140',            'Coach Sarah')
on conflict (id) do nothing;

create or replace function _seed_dates(start_date date, dow int) returns date[]
language plpgsql as $$
declare
  v_first date := start_date + ((dow - extract(dow from start_date)::int + 7) % 7);
  v_arr date[] := '{}'; i int;
begin
  for i in 0..11 loop v_arr := v_arr || (v_first + i*7); end loop;
  return v_arr;
end $$;

insert into public.timeslots (id, season_id, location_id, day_of_week, time_block, level, max_trainees, lesson_dates) values
  ('ts-1','summer-2024','tongelreep', 1,'18:00-19:00','intermediate', 7, _seed_dates('2024-04-01',1)),
  ('ts-2','summer-2024','tongelreep', 3,'19:00-20:00','intermediate', 7, _seed_dates('2024-04-01',3)),
  ('ts-3','summer-2024','tongelreep', 2,'17:00-18:00','beginner',     7, _seed_dates('2024-04-01',2)),
  ('ts-4','summer-2024','tongelreep', 4,'19:00-20:00','advanced',     7, _seed_dates('2024-04-01',4)),
  ('ts-5','summer-2024','gendersteyn',2,'18:00-19:00','beginner',     7, _seed_dates('2024-04-01',2)),
  ('ts-6','summer-2024','gendersteyn',4,'17:00-18:00','intermediate', 7, _seed_dates('2024-04-01',4)),
  ('ts-7','summer-2024','gendersteyn',5,'19:00-20:00','advanced',     7, _seed_dates('2024-04-01',5))
on conflict (id) do nothing;

drop function _seed_dates(date,int);

-- =============================================================
-- DONE. Verify by running: select * from get_timeslot_availability('summer-2024');
-- =============================================================
