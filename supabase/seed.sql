-- TutorTimeCard Lite — Local dev seed
-- Creates a super-admin auth user + corresponding User record.
-- Password is: admin123  (change before production!)

-- Insert into Supabase auth.users
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  role,
  aud,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@tutortimecard.local',
  -- bcrypt hash of 'admin123' — change this before production
  '$2a$10$PqiwOuFp5JCClLLa.wC1u.Yj8JmMQniJGCHDVTCAFB3OJDo2J4aXy',
  now(),
  'authenticated',
  'authenticated',
  '{"provider":"email","providers":["email"],"role":"super_admin","tenant_id":null}',
  '{"display_name":"Super Admin"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) on conflict (id) do nothing;

-- Corresponding User record (no tenant_id for super-admin)
insert into "public"."User" (
  "id",
  "tenant_id",
  "email",
  "role",
  "supabase_uid",
  "display_name"
) values (
  '00000000-0000-0000-0000-000000000002',
  null,
  'admin@tutortimecard.local',
  'super_admin',
  '00000000-0000-0000-0000-000000000001',
  'Super Admin'
) on conflict ("email") do nothing;
