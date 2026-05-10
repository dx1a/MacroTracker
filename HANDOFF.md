# MacroTrack — Session Handoff

## Project Location
`C:\Users\denni\Desktop\WorkingFile\macro-tracker`

## Stack
- **Next.js 16** App Router, TypeScript
- **Prisma v5** + **Neon PostgreSQL** (remote only — local `.env` has placeholder DATABASE_URL, run migrations in Neon SQL Editor)
- **Tailwind CSS v4** (`@import "tailwindcss"` + `@theme {}` block — no tailwind.config.js)
- **Zod v4** — use `err.issues` not `err.errors`
- **NextAuth v4** JWT strategy
- **Zustand** store (`src/store/useDashboard.ts`)
- Deployed on **Vercel**

---

## What Has Been Built (complete feature list)

### Theme
- Light/dark toggle stored in `localStorage` as `'theme'`
- Applied via `data-theme="light"` on `<html>` element
- Inline script in `src/app/layout.tsx` prevents flash-of-wrong-theme
- `src/components/layout/ThemeToggle.tsx` — `iconOnly` prop for mobile

### Dashboard (`src/app/dashboard/page.tsx`)
- Uses `localDateStr()` from `src/lib/date.ts` for client-local date
- Passes `?date=YYYY-MM-DD` to `/api/dashboard`
- Renders: macro rings, CarbFatBudget, WaterTracker, weekly stats, weight chart, streak, suggestions

### Macros
- `CarbFatBudget.tsx` — individual bars for Carbs AND Fat, plus combined flexible budget stacked bar with FLEXIBLE badge

### Quick Add (`src/components/food/QuickAddModal.tsx`)
- Add nutrition directly to a day without creating a persistent food item
- Fields: label (optional), calories, protein, carbs, fat, meal
- Live sanity check warns if macro calories deviate >10% from stated calories
- Calls `POST /api/logs/quick`
- `src/app/api/logs/quick/route.ts` — creates Food (isCustom:true) + FoodLogEntry in `prisma.$transaction`, upserts FoodLog

### Water Tracker (`src/components/dashboard/WaterTracker.tsx`)
- SVG animated glass that fills up; green gradient + ✓ when goal met
- IMPORTANT SVG fix: `clipPath` must be on wrapper `<g>`, NOT on the `<rect>` — clip-before-transform was causing water to overflow outside glass
- `fillY = 132 * (1 - pct)`, SVG has `overflow: "hidden"`
- Props: `initialMl`, `goalMl`, `date`, `isAutoGoal`
- Auto goal formula: `weight_lbs × activity_factor × gender_factor × goal_factor` → ml, clamped 1500–5000
- User can override goal in Profile (stored as `waterGoal Int?` in DB, in oz in UI, converted to ml)
- `GET/POST /api/water` — upserts `WaterLog.amount`

### Weight Logging (`src/components/dashboard/WeightLogModal.tsx`)
- Log weight for today OR previous dates (backfill)
- Date navigator with prev/next arrows + transparent date input overlay
- Sends `localToday` in POST body — only updates `profile.currentWeight` when logging actual today
- `POST /api/weight` uses `localToday ?? new Date().toISOString().slice(0,10)` for the guard

### Timezone
- `src/lib/date.ts` — `localDateStr(tz?)` uses `Intl.DateTimeFormat('en-CA', { timeZone })` — returns YYYY-MM-DD in user's local time
- `getPreferredTimezone()` reads from `localStorage` key `'timezone'`
- Profile page has `TimezoneCard` — IANA text input with `<datalist>` suggestions, saves to localStorage
- Dashboard API accepts `?date=` from client to avoid UTC mismatch

### Profile Page (`src/app/profile/page.tsx`)
- Activity level labels use frequency format: "Sedentary · Desk job / no exercise", "Light · 1–3×/week", etc.
- Water goal card: oz input (empty = auto), shows auto preview
- Timezone card at bottom

### TDEE Activity Multipliers (aligned to external calculators)
```
sedentary:   1.2
light:       1.375
moderate:    1.465   ← was 1.55, now corrected
active:      1.55
very_active: 1.725
```
Located in `src/lib/calculations.ts` → `ACTIVITY_MULTIPLIERS`

### Food Log Backfilling
- Date navigator in food log page allows logging for past dates
- Same transparent-input-over-display-text pattern

---

## Database (Prisma Schema highlights)

```prisma
model Profile {
  waterGoal    Int?      // ml; null = auto-calculate
  // ... other fields: calorieTarget, proteinTarget, carbTarget, fatTarget,
  //     currentWeight, goalWeight, goal, activityLevel, gender, tdee,
  //     adaptiveCalories, waterGoal
}

model WaterLog {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime
  amount    Int      // ml
  user      User     @relation(fields: [userId], references: [id])
  @@unique([userId, date])
}

model WeightLog {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime
  weight    Float    // lbs
  note      String?
  user      User     @relation(fields: [userId], references: [id])
  @@unique([userId, date])
}

model FoodLog {
  // entries is FoodLogEntry (NOT LogEntry)
}

model Food {
  userId    String   // field is userId (NOT createdBy)
}
```

### Migration needed (if not already applied)
Run in Neon SQL Editor:
```sql
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "waterGoal" INTEGER;
```

---

## Key API Routes
| Route | Method | Purpose |
|---|---|---|
| `/api/dashboard` | GET | Main dashboard data; accepts `?date=YYYY-MM-DD` |
| `/api/water` | GET/POST | Water intake for a date |
| `/api/weight` | GET/POST | Weight logs; POST accepts `localToday` |
| `/api/logs/quick` | POST | Quick-add nutrition to a day |
| `/api/logs/[date]` | GET/POST/DELETE | Food log entries for a date |
| `/api/profile` | GET/POST | User profile |

---

## Zustand Store (`src/store/useDashboard.ts`)
- `DashboardPayload` includes: `todayMacros`, `todayEntries`, `profile`, `weeklyStats`, `streak`, `adherenceScore`, `suggestions`, `recentWeights`, `todayWaterMl`
- `profile` includes: `waterGoal`, `gender`, `activityLevel`, `carbTarget`, `fatTarget`
- Fetch call: `fetch(\`/api/dashboard?date=${localDateStr()}\`)`

---

## CSS Classes of Note (`src/app/globals.css`)
- `.layout-main-grid`, `.layout-weekly-grid` — responsive grid layouts
- `.mobile-bottom-safe` — padding for mobile nav
- `.date-input` — transparent date picker overlay
- `[data-theme="light"]` — light mode overrides
- `btn-primary` gradient uses `var(--color-primary-dark)`

---

## Next Feature Discussed (not yet built)
**Camera scanner for nutrition labels:**
- Browser `MediaDevices.getUserMedia()` for camera capture
- Send base64 image to `/api/scan-label`
- Use **GPT-4o vision** (easiest) or Google Vision / AWS Textract for OCR
- Parse structured nutrition JSON, auto-fill Quick Add form
- UI: 📷 button in QuickAddModal opens camera → capture → loading → auto-fill
- Complexity: Medium. Requires OpenAI API key in `.env.local` if using GPT-4o route.

---

## Common Gotchas
1. **Zod v4**: `err.issues` not `err.errors`
2. **Prisma model names**: `foodLogEntry` not `logEntry`; `Food.userId` not `Food.createdBy`
3. **Dates**: Never use `new Date().toISOString().slice(0,10)` on the server for "today" — always pass client date via `?date=` param
4. **SVG clipPath**: Apply to `<g>` wrapper, not to `<rect>` directly, or the clip won't account for transforms
5. **Tailwind v4**: No config file; use CSS `@theme {}` block; arbitrary values work differently
6. **Local DB**: `.env` and `.env.local` have placeholder DATABASE_URL — always run migrations in Neon SQL Editor
