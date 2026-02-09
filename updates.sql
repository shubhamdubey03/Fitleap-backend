-- Create Coach Details Table
create table if not exists public.coach_details (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade,
  bank_account_no text,
  ifsc_code text,
  aadhar_card text,
  pan_card text,
  certificate_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.coach_details enable row level security;

-- Policy
create policy "Public Access" on public.coach_details for all using (true);
