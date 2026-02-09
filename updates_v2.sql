-- Add new columns to coach_details
alter table public.coach_details 
add column if not exists bank_name text,
add column if not exists aadhar_card_url text,
add column if not exists pan_card_url text;
