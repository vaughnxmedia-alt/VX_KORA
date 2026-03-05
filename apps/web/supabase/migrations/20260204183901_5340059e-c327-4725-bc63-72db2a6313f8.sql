-- Insert admin roles for Jocelyn and Justice
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('8fab27fb-7dda-4392-9ab1-51fccf1dd27e', 'admin'),
  ('55b03ae0-2dce-4cfe-a234-4ee8efc7e0d8', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Update profiles with full names
UPDATE public.profiles
SET full_name = 'Jocelyn Vaughn'
WHERE id = '8fab27fb-7dda-4392-9ab1-51fccf1dd27e';

UPDATE public.profiles
SET full_name = 'Justice Vaughn'
WHERE id = '55b03ae0-2dce-4cfe-a234-4ee8efc7e0d8';

UPDATE public.profiles
SET full_name = 'Rickayla Ambers'
WHERE id = '73bbae70-fe8b-4bc9-902a-718c61a020cb';

-- Ensure profiles exist (insert if missing)
INSERT INTO public.profiles (id, full_name)
VALUES 
  ('8fab27fb-7dda-4392-9ab1-51fccf1dd27e', 'Jocelyn Vaughn'),
  ('55b03ae0-2dce-4cfe-a234-4ee8efc7e0d8', 'Justice Vaughn'),
  ('73bbae70-fe8b-4bc9-902a-718c61a020cb', 'Rickayla Ambers')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;