-- Add country_code and flag to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS country_code text;
