-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'tutor');

-- CreateEnum
CREATE TYPE "AppointmentStatusEnum" AS ENUM ('default', 'complete', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('hourly', 'flat');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('day', 'week');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'tutor',
    "supabase_uid" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "google_access_token" TEXT,
    "google_refresh_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parent" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "grade_level" TEXT,
    "notes" TEXT,
    "parent_id" TEXT NOT NULL,
    "rate_type" "RateType" NOT NULL DEFAULT 'hourly',
    "rate_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentStatus" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "google_event_id" TEXT NOT NULL,
    "google_event_title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatusEnum" NOT NULL DEFAULT 'default',
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "matched_student_id" TEXT,
    "timesheet_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NameMatchCache" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "normalized_event_title" TEXT NOT NULL,
    "matched_student_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NameMatchCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timesheet" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "period_type" "PeriodType" NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "excel_url" TEXT,

    CONSTRAINT "Timesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorSettings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "calendar_color_filter" TEXT NOT NULL DEFAULT '11',
    "fuzzy_match_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.6,

    CONSTRAINT "TutorSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_supabase_uid_key" ON "User"("supabase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentStatus_google_event_id_tenant_id_key" ON "AppointmentStatus"("google_event_id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "NameMatchCache_normalized_event_title_tenant_id_key" ON "NameMatchCache"("normalized_event_title", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "TutorSettings_tenant_id_key" ON "TutorSettings"("tenant_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Parent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentStatus" ADD CONSTRAINT "AppointmentStatus_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentStatus" ADD CONSTRAINT "AppointmentStatus_matched_student_id_fkey" FOREIGN KEY ("matched_student_id") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentStatus" ADD CONSTRAINT "AppointmentStatus_timesheet_id_fkey" FOREIGN KEY ("timesheet_id") REFERENCES "Timesheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NameMatchCache" ADD CONSTRAINT "NameMatchCache_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NameMatchCache" ADD CONSTRAINT "NameMatchCache_matched_student_id_fkey" FOREIGN KEY ("matched_student_id") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorSettings" ADD CONSTRAINT "TutorSettings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
