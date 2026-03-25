# Acreage Brothers Flip Tracker

Mobile-first web app for tracking active house flips. Built with Next.js 14, Tailwind CSS, and Supabase.

## Quick Start

### 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Open **SQL Editor** → **New Query**
3. Paste the contents of `supabase/migration.sql` and run it
4. Go to **Authentication** → **Users** → **Add user** (check "Auto Confirm"):
   - `collin@acreagebrothers.com` (set a password)
   - `tyler@acreagebrothers.com` (set a password)
   - `roxy@acreagebrothers.com` (set a password)
5. Go to **Project Settings** → **API** and copy:
   - **Project URL** (e.g. `https://abc123.supabase.co`)
   - **anon public key**

### 2. Local Development

```bash
# Clone and install
git clone <your-repo>
cd flip-tracker
npm install

# Create env file
cp .env.local.example .env.local
# Edit .env.local with your Supabase URL and anon key

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in.

### 3. Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
4. Click **Deploy**

### 4. Add to Phone Home Screen (PWA)

After deploying, open the URL on your phone:
- **iPhone**: Safari → Share → "Add to Home Screen"
- **Android**: Chrome → Menu → "Add to Home screen"

This gives it a native app feel with no browser chrome.

## Project Structure

```
flip-tracker/
├── src/
│   ├── app/
│   │   ├── globals.css          # Tailwind + custom styles
│   │   ├── layout.tsx           # Root layout + metadata
│   │   └── page.tsx             # Entry point
│   ├── components/
│   │   ├── AppShell.tsx         # Main app with routing + state
│   │   ├── AuthProvider.tsx     # Supabase auth context
│   │   ├── ui.tsx               # Shared components (Toast, Nav, etc.)
│   │   └── screens/
│   │       ├── LoginScreen.tsx
│   │       ├── Dashboard.tsx
│   │       ├── DealDetail.tsx
│   │       ├── DealForm.tsx
│   │       ├── AddExpense.tsx   # ← Most important screen
│   │       ├── ExpensesList.tsx
│   │       └── DealsList.tsx
│   └── lib/
│       ├── supabase.ts          # Supabase client
│       ├── data.ts              # All CRUD operations
│       ├── types.ts             # TypeScript types + constants
│       └── utils.ts             # Formatting + calculations
├── supabase/
│   └── migration.sql            # Database schema
├── public/
│   └── manifest.json            # PWA manifest
└── package.json
```

## Calculated Fields

These are computed on the fly (never stored):
- **Rehab Spent** = SUM(expenses) excluding holding categories
- **Holding Spent** = SUM(expenses) in loan_payments, insurance, taxes, utilities
- **Selling Costs** = estimated_arv × 8%
- **Estimated Profit** = ARV - purchase - rehab - holding - selling costs
- **Actual Profit** (when sold) = sale price - purchase - all expenses - closing costs
- **ROI** = profit / total cash invested
- **Budget Used** = rehab spent / rehab budget (drives color coding)
