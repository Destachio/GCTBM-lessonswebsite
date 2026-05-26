-- ============================================================
-- Hotfix for supabase-schema.sql
-- Run this ONCE in the Supabase SQL Editor.
-- Safe to re-run.
-- ============================================================

-- 1) Fix "column reference 'status' is ambiguous" in create_booking.
--    The function's OUT column was named "status" which shadowed
--    bookings.status inside the query.
create or replace function public.create_booking(
  p_timeslot_id text,
  p_full_name   text,
  p_email       text,
  p_phone       text,
  p_replace_ids uuid[] default '{}'
)
returns table (booking_id uuid, booking_status text)
language plpgsql security definer set search_path = public as $$
declare
  v_max int; v_booked int; v_status text; v_new_id uuid;
begin
  select t.max_trainees into v_max from timeslots t where t.id = p_timeslot_id;
  if v_max is null then raise exception 'Timeslot not found'; end if;

  if coalesce(array_length(p_replace_ids,1),0) > 0 then
    update bookings set status = 'cancelled' where id = any(p_replace_ids);
  end if;

  select count(*) into v_booked from bookings b
    where b.timeslot_id = p_timeslot_id and b.status = 'booked';

  v_status := case when v_booked >= v_max then 'waitlist' else 'booked' end;

  insert into bookings (timeslot_id, full_name, email, phone, status)
  values (p_timeslot_id, trim(p_full_name), trim(p_email), trim(p_phone), v_status)
  returning id into v_new_id;

  return query select v_new_id, v_status;
end;
$$;
grant execute on function public.create_booking(text,text,text,text,uuid[]) to anon, authenticated;

-- 2) Tighten find_existing_bookings: never echo personal data back.
--    A malicious user could probe phone/email otherwise.
drop function if exists public.find_existing_bookings(text,text,text);
create or replace function public.find_existing_bookings(
  p_email text, p_phone text, p_name text
)
returns table (
  id          uuid,
  timeslot_id text,
  booking_status text
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

-- 3) Tighten get_my_bookings: do not echo full_name back to anon (they typed the email; that's all).
drop function if exists public.get_my_bookings(text);
create or replace function public.get_my_bookings(p_email text)
returns table (
  id          uuid,
  timeslot_id text,
  booking_status text,
  attendance  jsonb
)
language sql security definer set search_path = public as $$
  select b.id, b.timeslot_id, b.status, b.attendance
  from bookings b
  where lower(trim(b.email)) = lower(trim(p_email))
    and b.status in ('booked','waitlist');
$$;
grant execute on function public.get_my_bookings(text) to anon, authenticated;
