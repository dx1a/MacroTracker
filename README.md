# MacroTrack

A premium, full-stack macro and calorie tracking application with adaptive calorie coaching, smart weight analytics, and a modern fitness-app UI.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/dx1a/MacroTracker)

---

## Features

- **Dashboard** — Animated calorie ring, live macro progress bars, weight trend chart, weekly averages, streak tracking, and smart coaching suggestions
- **Food Logging** — Per-meal breakdown (Breakfast / Lunch / Dinner / Snacks), instant search across 50+ foods, custom food creation, optimistic UI updates
- **TDEE Calculator** — Mifflin-St Jeor BMR, activity-multiplied TDEE, live macro target preview with timeline estimation
- **Adaptive Calorie System** — Detects weight plateaus via rolling 14-day averages; makes ±100 kcal micro-adjustments; never drops below 1,200 kcal
- **Analytics** — Animated charts: weight history with smoothed trend, calories vs. target, stacked macro breakdown, deficit/surplus, weekly adherence score, 12-week projection
- **Auth & Persistence** — JWT-based accounts; all data persisted to PostgreSQL; accessible across devices

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) · React 19 · TypeScript |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| State | Zustand (optimistic updates) |
| Backend | Next.js API Routes |
| ORM | Prisma 5 |
| Database | PostgreSQL |
| Auth | NextAuth.js v4 (JWT + Credentials) |
| Validation | Zod 4 |

---

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (local or hosted)

### 1 — Clone & install

```bash
git clone https://github.com/dx1a/MacroTracker.git
cd MacroTracker
npm install
```

### 2 — Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/macro_tracker"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

### 3 — Set up the database

```bash
# Create the database (if local Postgres)
psql -U postgres -c "CREATE DATABASE macro_tracker;"

# Apply schema
npx prisma migrate dev --name init

# Seed with 50+ common foods
npm run db:seed
```

### 4 — Run

```bash
npm run dev
# → http://localhost:3000
```

---

## Deploying to Vercel

### Step 1 — Provision a PostgreSQL database

Use any of these (all have free tiers):

| Provider | Notes |
|----------|-------|
| [Neon](https://neon.tech) | Serverless Postgres, easiest setup |
| [Supabase](https://supabase.com) | Full Postgres + dashboard |
| [Railway](https://railway.app) | One-click Postgres |
| Vercel Postgres | Built into Vercel dashboard |

Copy the **connection string** — it looks like:
```
postgresql://user:password@host/dbname?sslmode=require
```

### Step 2 — Deploy to Vercel

1. Push this repo to GitHub (or fork it)
2. Go to [vercel.com/new](https://vercel.com/new) → Import the repo
3. In **Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Postgres connection string |
| `NEXTAUTH_SECRET` | A random 32-char string (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your Vercel deployment URL (e.g. `https://macrotrack.vercel.app`) |

4. Click **Deploy** — Vercel runs `prisma generate && next build` automatically

### Step 3 — Run migrations on the hosted DB

After the first deploy, run from your local machine (with `DATABASE_URL` pointing at prod):

```bash
DATABASE_URL="your-prod-connection-string" npx prisma migrate deploy
DATABASE_URL="your-prod-connection-string" npm run db:seed
```

Or use the Vercel CLI:
```bash
vercel env pull   # pulls prod env vars locally
npx prisma migrate deploy
npm run db:seed
```

---

## Project Structure

```
MacroTracker/
├── prisma/
│   ├── schema.prisma          # 8-model DB schema
│   └── seed.ts                # 50+ food items
├── src/
│   ├── app/
│   │   ├── api/               # All API routes
│   │   │   ├── auth/          # NextAuth + register
│   │   │   ├── dashboard/     # Aggregated dashboard data
│   │   │   ├── foods/         # Food search + custom create
│   │   │   ├── logs/          # Food log CRUD
│   │   │   ├── weight/        # Weight entries
│   │   │   ├── analytics/     # Chart data + projections
│   │   │   └── profile/       # TDEE calc + profile save
│   │   ├── (auth)/login       # Login page
│   │   ├── (auth)/register    # Register page
│   │   ├── dashboard/         # Main dashboard
│   │   ├── log/               # Food logging page
│   │   ├── analytics/         # Charts page
│   │   └── profile/           # Profile & TDEE calculator
│   ├── components/
│   │   ├── layout/            # Sidebar, MobileNav, AppLayout
│   │   ├── dashboard/         # MacroRing, MacroBar, WeightChart, StatCard...
│   │   └── food/              # FoodSearch, AddFoodModal, CreateFoodModal
│   ├── lib/
│   │   ├── calculations.ts    # BMR, TDEE, adaptive calories, projections
│   │   ├── auth.ts            # NextAuth config
│   │   ├── prisma.ts          # Prisma singleton
│   │   └── utils.ts           # Formatters, streak, helpers
│   ├── store/
│   │   └── useDashboard.ts    # Zustand store + optimistic updates
│   └── types/                 # TypeScript type definitions
├── .env.example               # Environment variable template
└── vercel.json                # Vercel build config
```

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:push` | Push schema without migration |
| `npm run db:seed` | Seed food database |
| `npm run db:studio` | Open Prisma Studio |

## Adaptive Calorie Logic

The system compares the 14-day rolling weight average to the prior 14 days:

- If trend lags expected pace by > 0.3 kg → reduce by 100 kcal
- If lean bulk stagnates → add 100 kcal (capped at TDEE + 500)
- Floor: 1,200 kcal · Requires at least 28 weight logs before activating

## License

MIT
