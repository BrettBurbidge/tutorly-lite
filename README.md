# TutorTimeCard Lite

A standalone, mobile-first web app for independent tutors to manage their students, track appointments from Google Calendar, and generate timesheets.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [SvelteKit 2](https://svelte.dev/docs/kit) with Svelte 5 runes |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Database | PostgreSQL via [Supabase](https://supabase.com) |
| ORM | [Prisma v7](https://www.prisma.io) with `@prisma/adapter-pg` |
| Auth | [Supabase Auth](https://supabase.com/docs/guides/auth) — Google OAuth for tutors, email/password for super-admin |
| Hosting | [Vercel](https://vercel.com) (`@sveltejs/adapter-vercel`) |
| Fuzzy matching | [Fuse.js](https://fusejs.io) |
| Excel export | [ExcelJS](https://github.com/exceljs/exceljs) |
| Email | [Resend](https://resend.com) |

---

## Architecture Overview

### Multi-tenancy
Each tutor is their own isolated tenant. A `tenant_id` UUID is set on every data table and enforced at two levels:
1. **Supabase RLS policies** — PostgreSQL rejects any query that crosses tenant boundaries
2. **Prisma middleware** — secondary application-level safety net

The `tenant_id` is stored in the Supabase JWT `app_metadata` so server hooks can resolve it without an extra DB round-trip on every request.

### User roles
| Role | Auth method | Access |
|---|---|---|
| **Tutor** | Google OAuth | `/portal/*` — their own workspace only |
| **Super-admin** | Email + password | `/superadmin/*` — platform metadata and aggregates only, no tutor data |

### Key flows
- **Sign up** — Google OAuth consent (identity + Calendar read) → atomic DB transaction creates Tenant + User + TutorSettings → welcome email → `/portal`
- **Appointment sync** — Google Calendar events with the configured color (default: red/Tomato) are fetched on portal load, fuzzy-matched to students via Fuse.js, and upserted into `AppointmentStatus`
- **Confirm period** — Unmatched non-cancelled appointments must be manually resolved first; matches are cached in `NameMatchCache` for future auto-matching; confirmed periods lock appointments and create a `Timesheet`
- **Export** — Excel file generated with ExcelJS; optionally emailed to the tutor via Resend (never to third parties)

### Data model
```
Tenant ─┬─ User (tutor, 1 per tenant)
        ├─ TutorSettings (1 per tenant)
        ├─ Parent[]
        │    └─ Student[] (rate: hourly | flat)
        ├─ AppointmentStatus[] (keyed on google_event_id)
        │    └─ → Student (matched_student_id, nullable)
        │    └─ → Timesheet (once confirmed)
        ├─ NameMatchCache[] (normalised title → student)
        └─ Timesheet[]
             └─ AppointmentStatus[] (locked)
```

---

## Local Development

### Prerequisites
- Node.js 20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli) — `brew install supabase/tap/supabase`

### First-time setup

**1. Install dependencies**
```bash
npm install
```

**2. Configure environment**
```bash
cp .env.example .env
# Fill in your Google OAuth credentials and Resend API key.
# Leave the Supabase and DB values as-is for local dev — they are set below.
```

**3. Start the local Supabase stack**
```bash
supabase start
```

This applies all migrations (schema + RLS policies) and seeds the super-admin user automatically. On first run it pulls Docker images which can take a few minutes.

**4. Update `.env` with local keys**

Copy the keys printed by `supabase start` into `.env`:
```bash
PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
PUBLIC_SUPABASE_ANON_KEY="<ANON_KEY from supabase start output>"
SUPABASE_SERVICE_ROLE_KEY="<SERVICE_ROLE_KEY from supabase start output>"
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

Or run `supabase status --output env` at any time to retrieve them.

**5. Generate the Prisma client**
```bash
npx prisma generate
```

**6. Start the dev server**
```bash
npm run dev
```

App is at **http://localhost:5173**

### Google OAuth for local dev
Add this redirect URI to your Google Cloud Console OAuth app:
```
http://127.0.0.1:54321/auth/v1/callback
```

### Local credentials
| | |
|---|---|
| Supabase Studio | http://127.0.0.1:54323 |
| Email preview (Mailpit) | http://127.0.0.1:54324 |
| Super-admin login | `admin@tutortimecard.local` / `admin123` |

### Daily workflow
```bash
supabase start   # start DB + auth
npm run dev      # start app

supabase stop    # stop when done
```

### Reset the database
```bash
supabase db reset   # drops and re-applies all migrations + seed
```

---

## Project Structure

```
src/
├── hooks.server.ts          # session resolution, role detection, route guards
├── app.d.ts                 # App.Locals types
├── lib/
│   ├── server/
│   │   ├── prisma.ts        # Prisma client singleton (pg adapter)
│   │   ├── supabase.ts      # SSR Supabase client factory
│   │   └── generated/       # Prisma generated client (gitignored)
│   ├── supabase.ts          # Browser Supabase client factory
│   ├── utils.ts             # cn(), formatDuration(), normalizeEventTitle()
│   └── components/
│       ├── AppointmentCard.svelte
│       ├── PortalNav.svelte
│       └── ui/              # Button, Badge, Input, Select, Dialog, Toast
├── routes/
│   ├── +page.svelte         # Landing page
│   ├── login/               # Google SSO + super-admin email login
│   ├── suspended/           # Suspended account page
│   ├── api/
│   │   ├── auth/callback/   # OAuth exchange + tenant creation
│   │   ├── calendar/        # Google Calendar fetch + fuzzy match
│   │   ├── appointments/    # Status updates, manual match, upsert
│   │   ├── timesheets/      # Confirm, Excel export, email
│   │   ├── portal/          # Parents, students, settings CRUD
│   │   └── superadmin/      # Tutor list, detail, suspend/reactivate
│   ├── portal/              # Tutor workspace (protected)
│   └── superadmin/          # Super-admin dashboard (protected)
prisma/
└── schema.prisma            # Database schema
supabase/
├── config.toml              # Local Supabase configuration
├── migrations/
│   ├── 20240001000000_init.sql   # Tables + indexes
│   └── 20240001000001_rls.sql    # RLS policies
└── seed.sql                 # Super-admin user
```

---

## Deployment

### Vercel

```bash
npm i -g vercel
vercel
```

Set all variables from `.env.example` in the Vercel dashboard (or via `vercel env add`). The production values point to your hosted Supabase project, not `127.0.0.1`.

### Supabase (production)

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Link it: `supabase link --project-ref <your-project-ref>`
3. Push migrations: `supabase db push`
4. Add `http://your-vercel-domain/api/auth/callback` to your Supabase project's Auth redirect allow-list
5. Enable Google provider in Supabase Auth dashboard with your Google OAuth credentials

### After first deploy — seed super-admin
Run the seed SQL against your production DB via the Supabase SQL editor, updating the email and password hash for your real admin account.
