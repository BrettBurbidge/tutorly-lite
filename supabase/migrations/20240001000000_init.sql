-- TutorTimeCard Lite — Initial Schema
-- Generated from prisma/schema.prisma

-- ─── Enums ───────────────────────────────────────────────────────────────────

create type "public"."TenantStatus" as enum ('active', 'suspended');
create type "public"."UserRole" as enum ('super_admin', 'tutor');
create type "public"."AppointmentStatusEnum" as enum ('default', 'complete', 'cancelled', 'no_show');
create type "public"."RateType" as enum ('hourly', 'flat');
create type "public"."PeriodType" as enum ('day', 'week');

-- ─── Tenant ──────────────────────────────────────────────────────────────────

create table "public"."Tenant" (
  "id"         uuid        not null default gen_random_uuid(),
  "status"     "TenantStatus" not null default 'active',
  "created_at" timestamptz not null default now(),
  constraint "Tenant_pkey" primary key ("id")
);

-- ─── User ─────────────────────────────────────────────────────────────────────

create table "public"."User" (
  "id"                   uuid        not null default gen_random_uuid(),
  "tenant_id"            uuid,
  "email"                text        not null,
  "role"                 "UserRole"  not null default 'tutor',
  "supabase_uid"         text        not null,
  "display_name"         text        not null,
  "google_access_token"  text,
  "google_refresh_token" text,
  "created_at"           timestamptz not null default now(),
  constraint "User_pkey"        primary key ("id"),
  constraint "User_email_key"   unique ("email"),
  constraint "User_supabase_uid_key" unique ("supabase_uid"),
  constraint "User_tenant_id_fkey" foreign key ("tenant_id") references "public"."Tenant"("id")
);

-- ─── Parent ───────────────────────────────────────────────────────────────────

create table "public"."Parent" (
  "id"         uuid        not null default gen_random_uuid(),
  "tenant_id"  uuid        not null,
  "first_name" text        not null,
  "last_name"  text        not null,
  "email"      text,
  "phone"      text,
  "created_at" timestamptz not null default now(),
  constraint "Parent_pkey"           primary key ("id"),
  constraint "Parent_tenant_id_fkey" foreign key ("tenant_id") references "public"."Tenant"("id")
);

-- ─── Student ──────────────────────────────────────────────────────────────────

create table "public"."Student" (
  "id"          uuid       not null default gen_random_uuid(),
  "tenant_id"   uuid       not null,
  "first_name"  text       not null,
  "last_name"   text       not null,
  "grade_level" text,
  "notes"       text,
  "parent_id"   uuid       not null,
  "rate_type"   "RateType" not null default 'hourly',
  "rate_amount" numeric(10,2) not null default 0,
  "created_at"  timestamptz  not null default now(),
  constraint "Student_pkey"           primary key ("id"),
  constraint "Student_tenant_id_fkey" foreign key ("tenant_id") references "public"."Tenant"("id"),
  constraint "Student_parent_id_fkey" foreign key ("parent_id") references "public"."Parent"("id")
);

-- ─── Timesheet ────────────────────────────────────────────────────────────────

create table "public"."Timesheet" (
  "id"           uuid         not null default gen_random_uuid(),
  "tenant_id"    uuid         not null,
  "period_start" date         not null,
  "period_end"   date         not null,
  "period_type"  "PeriodType" not null,
  "submitted_at" timestamptz  not null default now(),
  "excel_url"    text,
  constraint "Timesheet_pkey"           primary key ("id"),
  constraint "Timesheet_tenant_id_fkey" foreign key ("tenant_id") references "public"."Tenant"("id")
);

-- ─── AppointmentStatus ────────────────────────────────────────────────────────

create table "public"."AppointmentStatus" (
  "id"                 uuid                   not null default gen_random_uuid(),
  "tenant_id"          uuid                   not null,
  "google_event_id"    text                   not null,
  "google_event_title" text                   not null,
  "date"               date                   not null,
  "start_time"         timestamptz            not null,
  "end_time"           timestamptz            not null,
  "status"             "AppointmentStatusEnum" not null default 'default',
  "paid"               boolean                not null default false,
  "locked"             boolean                not null default false,
  "matched_student_id" uuid,
  "timesheet_id"       uuid,
  "created_at"         timestamptz            not null default now(),
  "updated_at"         timestamptz            not null default now(),
  constraint "AppointmentStatus_pkey"                       primary key ("id"),
  constraint "AppointmentStatus_google_event_id_tenant_id_key" unique ("google_event_id", "tenant_id"),
  constraint "AppointmentStatus_tenant_id_fkey"             foreign key ("tenant_id")          references "public"."Tenant"("id"),
  constraint "AppointmentStatus_matched_student_id_fkey"    foreign key ("matched_student_id") references "public"."Student"("id"),
  constraint "AppointmentStatus_timesheet_id_fkey"          foreign key ("timesheet_id")       references "public"."Timesheet"("id")
);

-- auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new."updated_at" = now();
  return new;
end;
$$;

create trigger "AppointmentStatus_updated_at"
  before update on "public"."AppointmentStatus"
  for each row execute function public.set_updated_at();

-- ─── NameMatchCache ───────────────────────────────────────────────────────────

create table "public"."NameMatchCache" (
  "id"                     uuid        not null default gen_random_uuid(),
  "tenant_id"              uuid        not null,
  "normalized_event_title" text        not null,
  "matched_student_id"     uuid        not null,
  "created_at"             timestamptz not null default now(),
  constraint "NameMatchCache_pkey"                                       primary key ("id"),
  constraint "NameMatchCache_normalized_event_title_tenant_id_key"       unique ("normalized_event_title", "tenant_id"),
  constraint "NameMatchCache_tenant_id_fkey"                             foreign key ("tenant_id")          references "public"."Tenant"("id"),
  constraint "NameMatchCache_matched_student_id_fkey"                    foreign key ("matched_student_id") references "public"."Student"("id")
);

-- ─── TutorSettings ────────────────────────────────────────────────────────────

create table "public"."TutorSettings" (
  "id"                    uuid    not null default gen_random_uuid(),
  "tenant_id"             uuid    not null,
  "display_name"          text    not null,
  "calendar_color_filter" text    not null default '11',
  "fuzzy_match_threshold" float8  not null default 0.6,
  constraint "TutorSettings_pkey"           primary key ("id"),
  constraint "TutorSettings_tenant_id_key"  unique ("tenant_id"),
  constraint "TutorSettings_tenant_id_fkey" foreign key ("tenant_id") references "public"."Tenant"("id")
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index "User_tenant_id_idx"               on "public"."User"("tenant_id");
create index "Parent_tenant_id_idx"             on "public"."Parent"("tenant_id");
create index "Student_tenant_id_idx"            on "public"."Student"("tenant_id");
create index "Student_parent_id_idx"            on "public"."Student"("parent_id");
create index "AppointmentStatus_tenant_id_idx"  on "public"."AppointmentStatus"("tenant_id");
create index "AppointmentStatus_date_idx"       on "public"."AppointmentStatus"("date");
create index "Timesheet_tenant_id_idx"          on "public"."Timesheet"("tenant_id");
create index "NameMatchCache_tenant_id_idx"     on "public"."NameMatchCache"("tenant_id");
