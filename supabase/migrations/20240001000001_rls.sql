-- TutorTimeCard Lite — Row Level Security Policies
-- Enforces tenant isolation: each tutor can only access their own data.
-- Super-admin (tenant_id IS NULL) has no access to any tenant data through RLS —
-- they query the Tenant table only via a service-role bypass in the application.

-- ─── Helper: resolve tenant_id from JWT ──────────────────────────────────────
-- We store tenant_id in app_metadata so it's available in the JWT without a DB lookup.

create or replace function public.current_tenant_id()
returns uuid language sql stable as $$
  select nullif(
    (auth.jwt() -> 'app_metadata' ->> 'tenant_id'),
    ''
  )::uuid
$$;

-- ─── Enable RLS on all tables ─────────────────────────────────────────────────

alter table "public"."Tenant"           enable row level security;
alter table "public"."User"             enable row level security;
alter table "public"."Parent"           enable row level security;
alter table "public"."Student"          enable row level security;
alter table "public"."AppointmentStatus" enable row level security;
alter table "public"."NameMatchCache"   enable row level security;
alter table "public"."Timesheet"        enable row level security;
alter table "public"."TutorSettings"    enable row level security;

-- ─── Tenant table ─────────────────────────────────────────────────────────────
-- Super-admin can read all rows; tutors can read only their own.

create policy "Tenant: tutor reads own row"
  on "public"."Tenant" for select
  using (id = public.current_tenant_id());

create policy "Tenant: service role bypass"
  on "public"."Tenant" for all
  using (auth.role() = 'service_role');

-- ─── User table ───────────────────────────────────────────────────────────────

create policy "User: tutor reads own row"
  on "public"."User" for select
  using (
    supabase_uid = auth.uid()::text
    or tenant_id = public.current_tenant_id()
  );

create policy "User: tutor updates own row"
  on "public"."User" for update
  using (tenant_id = public.current_tenant_id());

create policy "User: service role bypass"
  on "public"."User" for all
  using (auth.role() = 'service_role');

-- ─── Parent ───────────────────────────────────────────────────────────────────

create policy "Parent: tutor full access to own tenant"
  on "public"."Parent" for all
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "Parent: service role bypass"
  on "public"."Parent" for all
  using (auth.role() = 'service_role');

-- ─── Student ──────────────────────────────────────────────────────────────────

create policy "Student: tutor full access to own tenant"
  on "public"."Student" for all
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "Student: service role bypass"
  on "public"."Student" for all
  using (auth.role() = 'service_role');

-- ─── AppointmentStatus ────────────────────────────────────────────────────────

create policy "AppointmentStatus: tutor full access to own tenant"
  on "public"."AppointmentStatus" for all
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "AppointmentStatus: service role bypass"
  on "public"."AppointmentStatus" for all
  using (auth.role() = 'service_role');

-- ─── NameMatchCache ───────────────────────────────────────────────────────────

create policy "NameMatchCache: tutor full access to own tenant"
  on "public"."NameMatchCache" for all
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "NameMatchCache: service role bypass"
  on "public"."NameMatchCache" for all
  using (auth.role() = 'service_role');

-- ─── Timesheet ────────────────────────────────────────────────────────────────

create policy "Timesheet: tutor full access to own tenant"
  on "public"."Timesheet" for all
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "Timesheet: service role bypass"
  on "public"."Timesheet" for all
  using (auth.role() = 'service_role');

-- ─── TutorSettings ────────────────────────────────────────────────────────────

create policy "TutorSettings: tutor full access to own tenant"
  on "public"."TutorSettings" for all
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "TutorSettings: service role bypass"
  on "public"."TutorSettings" for all
  using (auth.role() = 'service_role');
