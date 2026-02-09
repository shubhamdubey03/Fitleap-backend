
-- Create Messages Table
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references public.users(id) on delete cascade not null,
  receiver_id uuid references public.users(id) on delete cascade not null,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_read boolean default false
);

-- Enable Row Level Security
alter table public.messages enable row level security;

-- Policies
-- 1. Users can insert messages where they are the sender
create policy "Users can send messages"
on public.messages for insert
with check (auth.uid() = sender_id);

-- 2. Users can view messages where they are the sender OR receiver
create policy "Users can view their own messages"
on public.messages for select
using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- 3. (Optional) Realtime subscription policy
-- Supabase Realtime requires publication
alter publication supabase_realtime add table public.messages;
