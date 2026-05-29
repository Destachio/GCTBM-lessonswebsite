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
  id              text primary key,
  season_id       text not null references public.seasons(id)   on delete cascade,
  location_id     text not null references public.locations(id) on delete cascade,
  day_of_week     int  not null check (day_of_week between 0 and 6),
  time_block      text not null,
  level           text not null check (level in ('beginner','intermediate','advanced')),
  max_trainees    int  not null default 7 check (max_trainees > 0),
  lesson_dates    date[] not null default '{}',
  cancelled_dates date[] not null default '{}',
  created_at      timestamptz not null default now()
);
alter table public.timeslots add column if not exists cancelled_dates date[] not null default '{}';

-- Trainer profiles: maps an auth.users row to a location. Admins have no row here.
create table if not exists public.trainer_profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  location_id  text not null references public.locations(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);
create index if not exists trainer_profiles_location_idx on public.trainer_profiles(location_id);
alter table public.trainer_profiles enable row level security;
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
  attendance   jsonb not null default '{}'::jsonb,
  handicap     text,
  is_member    boolean not null default false,
  invitee_name text,
  price        numeric(10,2),
  checkin_code text
);
-- (idempotent column adds for existing installs)
alter table public.bookings add column if not exists handicap     text;
alter table public.bookings add column if not exists is_member    boolean not null default false;
alter table public.bookings add column if not exists invitee_name text;
alter table public.bookings add column if not exists price        numeric(10,2);
alter table public.bookings add column if not exists checkin_code text;
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

-- Role helper functions used by RLS below.
create or replace function public.current_user_role()
returns text language sql security definer set search_path = public as $$
  select case
    when auth.uid() is null then 'anon'
    when exists (select 1 from public.trainer_profiles tp where tp.user_id = auth.uid()) then 'trainer'
    else 'admin'
  end;
$$;
grant execute on function public.current_user_role() to anon, authenticated;

create or replace function public.current_trainer_location()
returns text language sql security definer set search_path = public as $$
  select location_id from public.trainer_profiles where user_id = auth.uid();
$$;
grant execute on function public.current_trainer_location() to authenticated;

-- Public can READ reference data (needed for the booking flow UI)
create policy "anon reads seasons"   on public.seasons   for select using (true);
create policy "anon reads locations" on public.locations for select using (true);
create policy "anon reads timeslots" on public.timeslots for select using (true);

-- ADMIN: full access to everything (admin = authenticated user with no trainer profile)
create policy "admins all seasons"          on public.seasons          for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admins all locations"        on public.locations        for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admins all timeslots"        on public.timeslots        for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admins all bookings"         on public.bookings         for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
create policy "admins all trainer_profiles" on public.trainer_profiles for all to authenticated using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

-- TRAINER: read all timeslots, update only their own; read bookings only for their location.
create policy "trainers read all timeslots" on public.timeslots
  for select to authenticated using (current_user_role() = 'trainer');
create policy "trainers update own timeslots" on public.timeslots
  for update to authenticated
  using  (current_user_role() = 'trainer' and location_id = current_trainer_location())
  with check (current_user_role() = 'trainer' and location_id = current_trainer_location());
create policy "trainers read own bookings" on public.bookings
  for select to authenticated using (
    current_user_role() = 'trainer'
    and exists (select 1 from public.timeslots t where t.id = bookings.timeslot_id and t.location_id = current_trainer_location())
  );
create policy "trainers read own profile" on public.trainer_profiles
  for select to authenticated using (user_id = auth.uid());

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

-- 3b) Duplicate-booking detection. Returns only IDs + timeslot info.
--     Personal data is NEVER returned to anon callers (prevents probing).
drop function if exists public.find_existing_bookings(text,text,text);
create or replace function public.find_existing_bookings(
  p_email text, p_phone text, p_name text
)
returns table (
  id              uuid,
  timeslot_id     text,
  booking_status  text
)
language sql security definer set search_path = public as $$
  select b.id, b.timeslot_id, b.status
  from bookings b
  where b.status in ('booked','waitlist')
    and (
      (coalesce(p_email,'') <> '' and lower(b.email) = lower(trim(p_email)))
      or (coalesce(p_phone,'') <> '' and regexp_replace(b.phone,'[^0-9]','','g') = regexp_replace(p_phone,'[^0-9]','','g'))
      or (coalesce(p_name,'')  <> '' and lower(trim(b.full_name)) = lower(trim(p_name)))
    );
$$;
grant execute on function public.find_existing_bookings(text,text,text) to anon, authenticated;

-- 3b2) Server-authoritative pricing (members vs non-members, by level)
create or replace function public.compute_price(p_level text, p_is_member boolean)
returns numeric language sql immutable as $$
  select case
    when p_is_member then (case when p_level = 'beginner' then 135 else 110 end)
    else                  (case when p_level = 'beginner' then 175 else 150 end)
  end::numeric;
$$;
grant execute on function public.compute_price(text, boolean) to anon, authenticated;

-- 3c) Create a booking. Captures details, computes price, generates a check-in code.
drop function if exists public.create_booking(text,text,text,text,uuid[]);
drop function if exists public.create_booking(text,text,text,text,text,boolean,text,uuid[]);
create or replace function public.create_booking(
  p_timeslot_id  text,
  p_full_name    text,
  p_email        text,
  p_phone        text,
  p_handicap     text,
  p_is_member    boolean,
  p_invitee_name text,
  p_replace_ids  uuid[] default '{}'
)
returns table (booking_id uuid, booking_status text, checkin_code text, price numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_max int; v_level text; v_booked int; v_status text; v_new_id uuid; v_code text; v_price numeric;
begin
  select t.max_trainees, t.level into v_max, v_level from timeslots t where t.id = p_timeslot_id;
  if v_max is null then raise exception 'Timeslot not found'; end if;

  if coalesce(array_length(p_replace_ids,1),0) > 0 then
    update bookings set status='cancelled' where id = any(p_replace_ids);
  end if;

  select count(*) into v_booked from bookings b
    where b.timeslot_id = p_timeslot_id and b.status = 'booked';
  v_status := case when v_booked >= v_max then 'waitlist' else 'booked' end;

  v_price := compute_price(v_level, coalesce(p_is_member, false));
  v_code  := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  insert into bookings (timeslot_id, full_name, email, phone, status, handicap, is_member, invitee_name, price, checkin_code)
  values (
    p_timeslot_id, trim(p_full_name), trim(p_email), trim(p_phone), v_status,
    nullif(trim(coalesce(p_handicap,'')), ''),
    coalesce(p_is_member, false),
    nullif(trim(coalesce(p_invitee_name,'')), ''),
    v_price, v_code
  )
  returning id into v_new_id;

  return query select v_new_id, v_status, v_code, v_price;
end;
$$;
grant execute on function public.create_booking(text,text,text,text,text,boolean,text,uuid[]) to anon, authenticated;

-- 3d) Trainee fetches OWN bookings — requires email + a valid check-in code.
drop function if exists public.get_my_bookings(text);
drop function if exists public.get_my_bookings(text,text);
create or replace function public.get_my_bookings(p_email text, p_code text)
returns table (id uuid, timeslot_id text, booking_status text, attendance jsonb)
language sql security definer set search_path = public as $$
  select b.id, b.timeslot_id, b.status, b.attendance
  from bookings b
  where lower(trim(b.email)) = lower(trim(p_email))
    and b.status in ('booked','waitlist')
    and exists (
      select 1 from bookings v
      where lower(trim(v.email)) = lower(trim(p_email))
        and upper(trim(v.checkin_code)) = upper(trim(p_code))
    );
$$;
grant execute on function public.get_my_bookings(text, text) to anon, authenticated;

-- 3e) Toggle attendance — requires email + valid check-in code.
drop function if exists public.toggle_attendance(text,uuid,date);
drop function if exists public.toggle_attendance(text,text,uuid,date);
create or replace function public.toggle_attendance(
  p_email text, p_code text, p_booking_id uuid, p_date date
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_att jsonb; v_owner text;
begin
  if not exists (
    select 1 from bookings
    where lower(trim(email)) = lower(trim(p_email))
      and upper(trim(checkin_code)) = upper(trim(p_code))
  ) then
    raise exception 'Invalid check-in code';
  end if;

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
grant execute on function public.toggle_attendance(text,text,uuid,date) to anon, authenticated;

-- 3f) Trainer-scoped lesson update (cancel / reschedule).
create or replace function public.trainer_update_lessons(
  p_timeslot_id     text,
  p_lesson_dates    date[],
  p_cancelled_dates date[]
)
returns void
language plpgsql security definer set search_path = public as $$
declare v_role text; v_my_loc text; v_ts_loc text;
begin
  v_role := current_user_role();
  if v_role = 'anon' then raise exception 'Not authenticated'; end if;
  select t.location_id into v_ts_loc from timeslots t where t.id = p_timeslot_id;
  if v_ts_loc is null then raise exception 'Timeslot not found'; end if;
  if v_role = 'admin' then
    update timeslots set lesson_dates = p_lesson_dates, cancelled_dates = p_cancelled_dates where id = p_timeslot_id;
    return;
  end if;
  v_my_loc := current_trainer_location();
  if v_my_loc is null or v_my_loc <> v_ts_loc then raise exception 'Not authorised for this location'; end if;
  update timeslots set lesson_dates = p_lesson_dates, cancelled_dates = p_cancelled_dates where id = p_timeslot_id;
end;
$$;
grant execute on function public.trainer_update_lessons(text, date[], date[]) to authenticated;

-- 3g) Admin: find a user's UUID by email (for assigning trainer profiles).
create or replace function public.admin_find_user_by_email(p_email text)
returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid;
begin
  if current_user_role() <> 'admin' then raise exception 'Only admin can search users'; end if;
  select id into v_uid from auth.users where lower(email) = lower(trim(p_email));
  return v_uid;
end;
$$;
grant execute on function public.admin_find_user_by_email(text) to authenticated;

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
