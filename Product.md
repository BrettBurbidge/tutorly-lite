# TutorTimeCard Lite
## Product Requirements Document
**Version 1.1 · April 2026 · First Build**

---

## 1. Product Overview

TutorTimeCard Lite is a standalone responsive mobile-first web application for **independent tutors** — individuals who run their own tutoring practice without belonging to a tutoring organization. Each tutor who signs up gets their own fully isolated workspace.

Where the main Tutor Time Card product is a B2B tool (a business manages tutors as employees), TutorTimeCard Lite is B2C — **the tutor is the business**. They own and manage everything: their students, their parents, their rates, and their schedule.

### Key Differences from Tutor Time Card (Main)

| Concern              | Tutor Time Card (Main)              | TutorTimeCard Lite                     |
|----------------------|-------------------------------------|----------------------------------------|
| Who is the customer? | The tutoring business               | The individual tutor                   |
| User hierarchy       | Super-admin → Admin → Tutor         | Super-admin → Tutor (no org admin)     |
| Student management   | Admin sets up students and assigns  | Tutor manages their own students       |
| Rates                | Set by Admin per assignment         | Set by Tutor per student               |
| Onboarding           | Tutor is invited by Admin           | Tutor self-signs up via Google SSO     |
| Third-party sharing  | Tutor emails timesheet to org Admin | No third-party sharing — tutor only    |
| Codebase             | Separate repo                       | Separate repo                          |

### Shared Infrastructure
Both products share the same tech stack, deployment platform, Supabase organization, design system (ShadCN-Svelte), and fuzzy match / Excel export logic (shared utility packages). The super-admin dashboard covers both products from a single platform owner view.

---

## 2. Technical Stack & Environment

### 2.1 Frontend
- SvelteKit — SSR-first, file-based routing
- ShadCN-Svelte — component library for UI (shared design system with main app)
- Responsive mobile-first design (primary use is on phones/tablets)

### 2.2 Backend & Database
- PostgreSQL — relational database
- Prisma ORM — schema management and type-safe queries
- Supabase — managed Postgres host + Auth provider (separate Supabase project from main app)
- **Row-Level Security (RLS)** — each tutor's data is isolated by `tenant_id`; RLS policies scope all queries to the authenticated tutor's tenant

### 2.3 Infrastructure
- Vercel — hosting and deployment (SvelteKit adapter-vercel, separate project from main app)
- GitHub — separate repository, same GitHub organization

### 2.4 External Integrations
- Google Calendar API — appointment sync
- Google OAuth 2.0 — tutor authentication + Calendar permission grant (single combined flow)
- Resend — transactional email (welcome email, Excel report delivery to self)
- ExcelJS or SheetJS — Excel file generation (shared utility with main app)
- fuse.js — fuzzy string matching (shared utility with main app)

---

## 3. Multi-Tenancy Architecture

### 3.1 Tenancy Model
In TutorTimeCard Lite, **each tutor is their own tenant**. There are no organizations, no org admins, and no multi-user tenants in the first build. One Google login = one isolated workspace.

### 3.2 Isolation Strategy
- **Row-Level Security (RLS) in Postgres** — single shared database with `tenant_id` UUID on every table
- `tenant_id` maps 1:1 to the tutor's `User.id` — when a tutor signs up, their user ID becomes their tenant ID
- Supabase RLS policies scope all queries to the authenticated tutor's `tenant_id`
- Prisma middleware appends `tenant_id` to all queries as a secondary safety net
- Super-admin has `tenant_id: null` and can only access the `Tenant` metadata table — no access to any tutor's personal data

### 3.3 Tenant Table

| Field      | Description                                                         |
|------------|---------------------------------------------------------------------|
| id (UUID)  | Primary key — also used as the tutor's `tenant_id` throughout       |
| status     | `active` \| `suspended`                                             |
| created_at | Signup timestamp                                                    |

### 3.4 Data Scoping Rule
Every table — `User`, `Parent`, `Student`, `AppointmentStatus`, `NameMatchCache`, `Timesheet`, `TutorSettings` — has a non-nullable `tenant_id (FK → Tenant.id)`. No exceptions.

---

## 4. User Roles

| Role        | Auth Method                 | Primary Access                                                    |
|-------------|-----------------------------|-------------------------------------------------------------------|
| Super-Admin | Email + Password (Supabase) | `/superadmin/*` — platform metadata only, no tutor data access   |
| Tutor       | Google SSO (OAuth 2.0)      | `/portal/*` — full self-managed tutor workspace                   |

There is no "Admin" role in TutorTimeCard Lite. The tutor has full control of their own workspace.

---

## 5. Tutor Signup & Tenant Creation

### 5.1 Signup Flow

Tutors sign up entirely through Google SSO — there is no email/password form. Connecting Google also grants Calendar access in the same step, eliminating any separate "connect your calendar" screen later.

1. Visitor goes to `/` or `/signup` and clicks **"Sign up with Google"**
2. Google OAuth consent screen requests:
   - Standard profile + email scopes (identity)
   - `https://www.googleapis.com/auth/calendar.readonly` (Calendar sync)
3. On successful OAuth callback:
   - If a `User` already exists for this Google account → log in, redirect to `/portal`
   - If new user: atomically create in a single DB transaction:
     - A new `Tenant` record (`status: active`)
     - A `User` record linked to the tenant (`role: tutor`) with Google tokens stored
     - A default `TutorSettings` record for the tenant
   - Send a welcome email via Resend
   - Redirect new tutor to `/portal`

If the transaction fails at any step, all changes are rolled back and a clear error is shown.

### 5.2 No Onboarding Step
Since all identity comes from Google (name, email, profile picture), no onboarding form is needed. The tutor's Google display name is used as their display name in the app and on exports. They can update it later in Settings if needed.

### 5.3 Returning Tutor Login
- `/login` or `/` shows **"Sign in with Google"**
- OAuth success → redirect to `/portal`
- If `access_token` is expired → silently refresh using `refresh_token`
- If refresh fails (revoked) → show a banner in the portal prompting reconnection from Settings

### 5.4 No Approval Gate
Self-serve and immediately active. Suspension is reserved for super-admin action only.

---

## 6. Super-Admin Dashboard

The super-admin provides the platform owner with visibility across all Lite tenants for operational management. It **cannot access any tutor's personal data** — only metadata and aggregates.

> For the first build, Lite has its own separate super-admin login and dashboard. Merging into a single cross-product super-admin view is a planned future step once both products are live.

### 6.1 Access & Auth
- Super-admin logs in at `/login` with email + password (separate from tutor Google SSO)
- On login → `role: super_admin` → redirect to `/superadmin/dashboard`
- Super-admin accounts are provisioned manually (seed script or Supabase dashboard)
- Super-admin has `tenant_id: null` in their user record

### 6.2 Super-Admin Dashboard Home — `/superadmin/dashboard`
- Summary cards: Total Tutors, Active Tutors, Suspended Tutors, Signups This Month
- Recent signups list (last 10): Display Name, Email, Signup Date, Status

### 6.3 Tutor List — `/superadmin/tutors`
- Table: Display Name, Email, Status (Active / Suspended), Signup Date, Student Count, Timesheet Count
- Student Count and Timesheet Count are aggregates only — no names or details exposed
- Search / filter by name, status, date
- Actions per row: Suspend, Reactivate, View Details

### 6.4 Tutor Detail — `/superadmin/tutors/[id]`
- Display Name, Email, Status, Signup Date
- Aggregate stats: student count, timesheet count
- No access to student names, appointment data, rates, or any personal content
- Actions: Suspend, Reactivate

### 6.5 Suspension Behavior
- Suspended tutor is blocked from login: "Your account has been suspended. Contact support."
- In-flight sessions are invalidated immediately
- No data is deleted

---

## 7. Authentication & Routing

### 7.1 Tutor Login (Google SSO Only)
- All tutor auth goes through Google OAuth — no email/password path exists for tutors
- New tutor → tenant + user created atomically → `/portal`
- Returning tutor → `/portal`

### 7.2 Super-Admin Login
- Email + Password via Supabase Auth at `/login`
- On login → `/superadmin/dashboard`

### 7.3 Tenant Resolution
- On every authenticated tutor request, `tenant_id` is read from JWT claims (`raw_app_meta_data`)
- All DB queries are scoped to that `tenant_id` via RLS + Prisma middleware
- Super-admin has `tenant_id: null` — their RLS bypass is scoped strictly to the `Tenant` table only

### 7.4 Route Guards

| Accessing Route   | Authenticated Role | Outcome                              |
|-------------------|--------------------|--------------------------------------|
| `/superadmin/*`   | Unauthenticated    | Redirect to `/login`                 |
| `/superadmin/*`   | Tutor              | Redirect to `/portal`                |
| `/portal/*`       | Unauthenticated    | Redirect to `/login`                 |
| `/portal/*`       | Super-Admin        | Redirect to `/superadmin/dashboard`  |

### 7.5 Suspended Account Handling
- Any login attempt by a suspended tutor shows a suspension message regardless of valid credentials

---

## 8. Tutor Self-Management

The tutor manages everything in their workspace directly — there is no admin intermediary.

### 8.1 Settings Page — `/portal/settings`
- View connected Google account (name, email, profile picture)
- Edit display name (pre-filled from Google, used on Excel exports)
- Reconnect Google (if Calendar access was revoked)
- Configure Calendar color filter (default: red) — the event color used to identify tutoring appointments in Google Calendar
- Configure fuzzy match threshold (default: 0.6) — shown with a plain-English explanation, not just a raw number

### 8.2 Parent Management — `/portal/parents`
- Add / Edit / Delete parent: First Name, Last Name, Email, Phone
- Each parent is the billing contact for their child(ren)
- Parent name appears on Excel exports (for the tutor's own records)

### 8.3 Student Management — `/portal/students`
- Add / Edit / Delete student: First Name, Last Name, Grade Level, Notes
- Each student linked to exactly one parent
- Each student has a **rate configuration** set by the tutor:
  - Rate type: `hourly` or `flat per session`
  - Rate amount (decimal)
- Students are matched to appointments via fuzzy name logic

---

## 9. Tutor Portal

### 9.1 Google Calendar Sync
- On portal load, fetch events from the tutor's Google Calendar using stored OAuth tokens
- Filter: **RED events only** (Google color ID: 11 / Tomato) — configurable per tutor in Settings
- If `access_token` expired → silently refresh using `refresh_token`
- If refresh fails → show a reconnect banner; portal still loads but Calendar sync is disabled until reconnected
- Events fetched fresh on each load and merged with local `AppointmentStatus` records (keyed on `google_event_id` + `tenant_id`)

---

### 9.2 Student Matching — Fuzzy Name Logic

When a red calendar event is fetched, the app attempts to match the event title to one of the tutor's students.

#### 9.2.1 Matching Algorithm
- Strip punctuation and lowercase the event title
- Compare against first name, last name, and full name of every student in the tutor's workspace
- Use **fuse.js** with the tutor's configured threshold (default: 0.6)
- **One clear winner above threshold** → auto-match, set `matched_student_id`
- **Two or more score similarly** → ambiguous, treated as unmatched
- **None above threshold** → unmatched

#### 9.2.2 Unmatched Appointment Behavior
- Card displays raw event title so the tutor knows what the session is for
- Card renders in **purple / violet** with an "Unmatched" badge
- Tutor can still set status (Complete / Cancelled / No Show) on an unmatched card
- Tutor **cannot confirm** a period if any unmatched Complete or No Show appointments remain unresolved
- Unmatched Cancelled appointments pass through confirmation without requiring a student match

#### 9.2.3 Manual Resolution at Confirm
- "Confirm & Submit" with unresolved unmatched appointments triggers a resolution screen first
- Lists each unmatched appointment: event title, date, time, duration
- Each has a "Select student..." dropdown from the tutor's student list
- Selection saves `matched_student_id`; match persisted to `NameMatchCache` for future auto-matching

---

### 9.3 Portal Layout — Day / Week Toggle
- Header: tutor's display name, today's date, Day / Week toggle
- **Day View:** all appointments for the selected date, sorted by start time as time-slot cards
- **Week View:** 7-day column layout with appointments per day
- Navigation: Previous / Next arrows, "Today" shortcut, date picker

### 9.4 Appointment Card

Displays:
- Student full name (if matched) **OR** raw event title (if unmatched)
- Session duration (from event start/end times)
- Start time
- Paid / Unpaid badge
- Status buttons: **Complete | Cancelled | No Show**

#### 9.4.1 Card Color States

| State                         | Card Color      | Trigger                                                    |
|-------------------------------|-----------------|------------------------------------------------------------|
| Default (unreviewed, matched) | Light gray      | Student matched, no status action taken yet                |
| Unmatched                     | Purple / Violet | No student matched from event title                        |
| Complete                      | Green           | Tutor taps Complete                                        |
| Cancelled                     | Orange          | Tutor taps Cancelled OR event cancelled in Google Calendar |
| No Show                       | Red             | Tutor taps No Show                                         |

- Google-cancelled events auto-receive Cancelled status without tutor input
- Card color reflects status; Unmatched badge overlays on top so both states remain visible
- Status can be changed any time before the period is confirmed

### 9.5 Paid / Unpaid Tracking
- Each card has a Paid toggle (default: Unpaid)
- Rate is pulled from the matched student's rate configuration (hourly or flat per session)
- If unmatched, rate shows as `—` until a student is assigned at the resolution step
- No live payment processing in this build — tracking is for the tutor's own records only

### 9.6 End-of-Period Confirmation & Export

#### 9.6.1 Confirm Button
- "Confirm & Submit" at bottom of Day View and Week View
- Unmatched non-cancelled appointments → resolution screen shown first (Section 9.2.3)
- Confirmation modal: session count by status, total hours, estimated earnings
- On confirm: appointments locked, `Timesheet` record created

#### 9.6.2 Excel Export
- After confirming, tutor downloads an `.xlsx` file for the period
- Columns: Date, Student Name, Parent Name, Start Time, End Time, Duration (hrs), Status, Rate Type, Rate, Amount, Paid
- Totals row: total hours, total earnings
- File named: `[TutorDisplayName]_[Date].xlsx`

#### 9.6.3 Email Export to Self
- "Email to Me" sends the Excel file to the tutor's own Google account email
- Subject: `Timesheet — [Display Name] — [Period]`
- Body: brief session summary + Excel attachment
- No option to email to parents or third parties — exports are for the tutor only
- Success/failure toast shown after send

---

## 10. Data Model (Prisma Schema Overview)

> Every table includes a non-nullable `tenant_id (FK → Tenant.id)` enforced by RLS and Prisma middleware. `tenant_id` maps 1:1 to the tutor's `User.id`.

| Table                 | Key Fields                                                                                                                                                                                          |
|-----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Tenant**            | id, status (active\|suspended), created_at                                                                                                                                                          |
| **User**              | id, **tenant_id** (null for super_admin), email, role (super_admin\|tutor), supabase_uid, display_name, google_access_token, google_refresh_token, created_at                                      |
| **Parent**            | id, tenant_id, first_name, last_name, email, phone, created_at                                                                                                                                      |
| **Student**           | id, tenant_id, first_name, last_name, grade_level, notes, parent_id (FK → Parent), rate_type (hourly\|flat), rate_amount, created_at                                                               |
| **AppointmentStatus** | id, tenant_id, google_event_id, google_event_title, date, status (complete\|cancelled\|no_show\|default), paid (bool), locked (bool), matched_student_id (FK → Student, nullable), timesheet_id (FK → Timesheet, nullable) |
| **NameMatchCache**    | id, tenant_id, normalized_event_title, matched_student_id (FK → Student), created_at                                                                                                               |
| **Timesheet**         | id, tenant_id, period_start, period_end, period_type (day\|week), submitted_at, excel_url                                                                                                          |
| **TutorSettings**     | id, tenant_id, display_name, calendar_color_filter (default: red), fuzzy_match_threshold (default: 0.6)                                                                                            |

> Note: There is no `TutorStudent` join table in Lite. Rate configuration lives directly on the `Student` record since the tutor owns all their students with no org-level assignment layer.

---

## 11. Key API Routes (SvelteKit Server Routes)

`tenant_id` is always resolved from the session — never accepted from the client.

| Route                               | Method      | Role        | Description                                                 |
|-------------------------------------|-------------|-------------|-------------------------------------------------------------|
| `/api/auth/callback`                | GET         | Public      | Supabase OAuth callback; creates tenant + user if new       |
| `/api/superadmin/tutors`            | GET         | Super-Admin | List all tutors with aggregate stats                        |
| `/api/superadmin/tutors/[id]`       | GET         | Super-Admin | Tutor metadata + aggregate counts                           |
| `/api/superadmin/tutors/[id]/suspend` | PATCH     | Super-Admin | Suspend or reactivate a tutor                               |
| `/api/calendar/events`              | GET         | Tutor       | Fetch + filter Google Calendar events for date range        |
| `/api/calendar/match`               | POST        | Tutor       | Run fuzzy match against tutor's students                    |
| `/api/appointments/[id]/status`     | PATCH       | Tutor       | Update appointment status or paid flag                      |
| `/api/appointments/[id]/match`      | PATCH       | Tutor       | Manually set matched_student_id                             |
| `/api/timesheets`                   | POST        | Tutor       | Confirm period, lock appointments, create timesheet         |
| `/api/timesheets/[id]/export`       | GET         | Tutor       | Generate and return Excel file for download                 |
| `/api/timesheets/[id]/email`        | POST        | Tutor       | Email Excel to tutor's own Google account email             |
| `/api/portal/parents`               | GET / POST  | Tutor       | List / create parents                                       |
| `/api/portal/parents/[id]`          | PATCH / DELETE | Tutor    | Update / delete parent                                      |
| `/api/portal/students`              | GET / POST  | Tutor       | List / create students with rate config                     |
| `/api/portal/students/[id]`         | PATCH / DELETE | Tutor    | Update / delete student                                     |
| `/api/portal/settings`              | GET / PATCH | Tutor       | Get / update tutor settings                                 |

---

## 12. SvelteKit Page Routes

| Route                          | Role        | Description                                                      |
|--------------------------------|-------------|------------------------------------------------------------------|
| `/`                            | Public      | Landing page with "Sign up with Google" and "Sign in" CTAs       |
| `/login`                       | Public      | Google SSO for tutors; email+password for super-admin            |
| `/portal`                      | Tutor       | Main portal: Day/Week toggle, appointment cards                  |
| `/portal/parents`              | Tutor       | Parent list + add/edit form                                      |
| `/portal/students`             | Tutor       | Student list + add/edit form with rate config                    |
| `/portal/timesheets`           | Tutor       | Past confirmed timesheets — download or re-email                 |
| `/portal/settings`             | Tutor       | Display name, Google connection status, color filter, threshold  |
| `/superadmin/dashboard`        | Super-Admin | Platform summary: tutor counts, signups this month               |
| `/superadmin/tutors`           | Super-Admin | All tutors table with search, filter, suspend/reactivate         |
| `/superadmin/tutors/[id]`      | Super-Admin | Tutor metadata + aggregate stats, suspend/reactivate             |

---

## 13. Out of Scope — First Build

- Email or sharing of any kind to parents or third parties — exports are for the tutor only
- Organizations or multi-user tenants (each tutor is always their own tenant in Lite)
- Billing, subscriptions, or payment processing of any kind
- Shared super-admin dashboard with the main Tutor Time Card product (separate in first build)
- Push notifications or SMS
- Parent-facing portal or parent login
- Recurring schedule setup (all scheduling lives in Google Calendar)
- Custom invoice generation (Excel export only)
- Multiple Google Calendar accounts per tutor

---

## 14. Open Questions & Decisions Needed

| Question                                                          | Notes                                                                                                                        |
|-------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------|
| Separate Supabase project vs shared with main app?               | Recommended: separate project for clean isolation; shared is possible but complicates RLS policies and super-admin scoping   |
| Super-admin accounts shared or separate between Lite and main app?| First build: separate. Future: a single platform super-admin covering both products is the logical next step                 |
| What happens if a tutor revokes Google Calendar access?           | Show a persistent banner in the portal; tutor reconnects from Settings; portal loads but sync is disabled until reconnected  |
| Resend sender domain                                              | Same verified sending domain as main app can be reused if both share the domain                                              |
| Atomic signup transaction failure handling                        | Tenant + User + TutorSettings must all succeed or all roll back; surface a clear retry message to the tutor                  |

---

## 15. First Build Success Criteria

- A tutor can visit the site, click "Sign up with Google", grant Calendar access, and land directly in their portal — no additional onboarding step required
- Each tutor's data is fully isolated — no cross-tenant data is accessible at any point via RLS
- Tutor can add parents, add students linked to parents, and configure a rate per student
- Tutor Portal loads red Google Calendar events, fuzzy-matches them to students, and displays appointment cards
- Matched appointments display the student name; unmatched display the event title in purple
- Tutor can mark each appointment Complete, Cancelled, or No Show and toggle Paid
- Unmatched non-cancelled appointments must be resolved before a period can be confirmed
- Manual matches are cached and auto-applied on future syncs
- Tutor can confirm a period, download an Excel timesheet, and email it to themselves
- No third-party email or parent sharing exists anywhere in the app
- Super-admin can log in, view all tutors with aggregate stats, and suspend or reactivate any tutor
- Super-admin cannot access any tutor's students, appointments, rates, or personal business data
- All routes are role-protected
- App is fully functional and responsive on mobile browsers

---

*TutorTimeCard Lite PRD — v1.1 — Confidential*