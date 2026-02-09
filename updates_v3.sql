-- Add approval status to coach_details
alter table public.coach_details 
add column if not exists is_approved boolean default false;
