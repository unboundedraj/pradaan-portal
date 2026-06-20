# Pradaan Portal

A centralized, full-stack donations platform built on **Next.js 16 App Router**, **TypeScript**, **Supabase**, and **Stripe**. Pradaan ("to donate/give" in Hindi) connects donors, non-profit organizations, and a community of governance voters into a single cohesive ecosystem.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Domain Rules](#core-domain-rules)
3. [Tech Stack](#tech-stack)
4. [Database Schema](#database-schema)
5. [The Pradaan Pot (Overflow Engine)](#the-pradaan-pot-overflow-engine)
6. [Dynamic Certificates](#dynamic-certificates)
7. [Governance Voting](#governance-voting)
8. [Project Structure](#project-structure)
9. [Authentication & Role Model](#authentication--role-model)
10. [Environment Variables](#environment-variables)
11. [Getting Started](#getting-started)
12. [Key Next.js 16 Breaking Changes](#key-nextjs-16-breaking-changes)

---

## Architecture Overview

```
Browser / Client
      │
      ▼
Next.js 16 App Router (Vercel Edge / Node.js Runtime)
  ├── Server Components   → DB reads, SSR pages, no client JS shipped
  ├── Client Components   → Interactive UI, forms, wallet dashboard
  ├── Server Actions      → Mutations (donate, vote, fund wallet)
  └── Route Handlers      → Stripe webhook receiver, PDF byte stream
      │
      ▼
Supabase (PostgreSQL + Auth + Realtime)
  ├── auth.users          → Managed by Supabase Auth
  ├── profiles            → Application-level user mirror (trigger-synced)
  ├── donor_profiles      → Wallet balance (integer cents)
  ├── org_profiles        → Organization metadata
  ├── drives              → Fundraising campaigns
  ├── donations           → Immutable donation ledger
  ├── wallet_transactions → Stripe top-up ledger (idempotent via stripe_intent_id)
  ├── pradaan_pot_ledger  → Central overflow bank
  ├── polls / poll_options / poll_votes → Governance machinery
  └── donor_analytics     → Real-time view (materialized roll-up)
      │
      ▼
Stripe (Test Mode)
  └── Payment Intents → Webhook → wallet_transactions insert
```

---

## Core Domain Rules

### 1. All Money is Integers (Cents)

> **This is a hard constraint. No floats, ever.**

Every monetary value — wallet balances, donation amounts, drive targets, pot totals — is stored and computed as a 64-bit integer representing **cents** (1/100th of a rupee or dollar, depending on locale).

| Human-readable | DB value |
|---|---|
| ₹500.00 | `50000` |
| ₹10.50 | `1050` |
| ₹0.01 | `1` |

**Why:** IEEE 754 floating-point arithmetic is lossy for decimal math. `0.1 + 0.2 !== 0.3` in JavaScript. A financial platform that accrues rounding errors across thousands of donations will produce incorrect balances. Integer cents math is always exact.

**Conversion helpers** (in `src/lib/money.ts`):
```ts
export const toCents = (rupees: number) => Math.round(rupees * 100);
export const toRupees = (cents: number) => (cents / 100).toFixed(2);
export const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
    .format(cents / 100);
```

### 2. Transaction Source Duality

Donations can originate from two sources tracked via the `transaction_source` enum:

- **`STRIPE`** — Direct card payment for a drive (no wallet involved).
- **`WALLET`** — Deducted from the donor's pre-funded virtual wallet balance.

The donation Server Action must atomically:
1. Verify sufficient wallet balance (if `source = WALLET`).
2. Insert the `donations` row.
3. Decrement `donor_profiles.wallet_balance`.

All three steps run inside a Supabase RPC (database function) to guarantee atomicity — no partial state is possible.

### 3. Drive Lifecycle

```
PENDING → APPROVED → ACTIVE → COMPLETED
```

- `PENDING`: Created by an org, awaiting Admin approval.
- `APPROVED`: Admin approved; the drive becomes publicly visible.
- `ACTIVE`: The `ends_at` timestamp has not yet passed.
- `COMPLETED`: The `ends_at` timestamp has passed OR the Admin manually closes it.

Drives **do not close early** when they hit their `target_amount`. They remain `ACTIVE` until `ends_at`. This is intentional — the overflow engine depends on it.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js App Router | 16.2.6 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Database | Supabase (PostgreSQL 15) | Hosted |
| Auth | Supabase Auth (JWT) | Hosted |
| Payments | Stripe (Test Mode) | Latest |
| Theme | next-themes | Latest |
| Icons | lucide-react | Latest |
| Runtime | Node.js (Vercel) | 20+ |

### Why Supabase?

- PostgreSQL-native: complex queries, views, triggers, and RPCs without an ORM.
- Row-Level Security (RLS): database-enforced access control per authenticated user.
- Realtime: WebSocket subscriptions for live drive progress updates.
- Auth: manages JWT sessions, refresh tokens, and the `auth.users` table.

### Why Server Actions over REST?

Next.js 16 Server Actions run exclusively on the server and are the idiomatic mutation layer for App Router. They:
- Eliminate a separate API route for every form submission.
- Inherit the request's cookie/session context automatically.
- Return updated UI in a single server roundtrip via React's transitions model.
- Are not exposed as stable URL endpoints (unlike Route Handlers).

Route Handlers (`route.ts`) are used **only** for Stripe webhooks (which require raw body access and a specific HTTP verb contract).

---

## Database Schema

### Enums

```sql
-- User roles (set at signup, stored in profiles.role)
CREATE TYPE user_role AS ENUM ('DONOR', 'ORGANIZATION', 'ADMIN');

-- Fundraising drive lifecycle
CREATE TYPE drive_status AS ENUM ('PENDING', 'APPROVED', 'ACTIVE', 'COMPLETED');

-- Payment origin for a donation
CREATE TYPE transaction_source AS ENUM ('STRIPE', 'WALLET');

-- Direction of money flow in the Pradaan Pot
CREATE TYPE pot_ledger_type AS ENUM ('INFLOW_OVERFLOW', 'OUTFLOW_POLL');

-- State of a governance poll
CREATE TYPE poll_status AS ENUM ('ACTIVE', 'RESOLVED');
```

### Tables

#### `profiles`
Bridges `auth.users` to application logic. Populated automatically via an `AFTER INSERT` trigger on `auth.users`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | FK → `auth.users.id`, PK |
| `email` | `text` | Unique |
| `role` | `user_role` | Set during onboarding |
| `is_verified` | `boolean` | Admin can verify org accounts |
| `created_at` | `timestamptz` | Auto |

#### `donor_profiles`
1:1 extension of `profiles` for users with role `DONOR`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | FK → `profiles.id`, PK |
| `full_name` | `text` | |
| `wallet_balance` | `integer` | **Cents.** Default `0`. Never negative. |

#### `org_profiles`
1:1 extension of `profiles` for users with role `ORGANIZATION`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | FK → `profiles.id`, PK |
| `org_name` | `text` | |
| `description` | `text` | |
| `website` | `text` | Optional |

#### `drives`
Fundraising campaigns created by organizations.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `org_id` | `uuid` | FK → `org_profiles.id` |
| `title` | `text` | |
| `description` | `text` | |
| `target_amount` | `integer` | **Cents** |
| `current_amount` | `integer` | **Cents.** Incremented by trigger/RPC on donation insert |
| `status` | `drive_status` | Starts as `PENDING` |
| `ends_at` | `timestamptz` | Drive expiry |
| `created_at` | `timestamptz` | Auto |

#### `donations`
The immutable financial ledger. Rows are never updated or deleted.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `donor_id` | `uuid` | FK → `donor_profiles.id` |
| `drive_id` | `uuid` | FK → `drives.id` |
| `amount` | `integer` | **Cents** |
| `source` | `transaction_source` | `STRIPE` or `WALLET` |
| `created_at` | `timestamptz` | Auto |

#### `wallet_transactions`
Records every Stripe deposit to a donor's wallet. The `stripe_intent_id` UNIQUE constraint makes webhook processing idempotent.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `donor_id` | `uuid` | FK → `donor_profiles.id` |
| `amount` | `integer` | **Cents** |
| `stripe_intent_id` | `text` | UNIQUE — prevents double-credit |
| `created_at` | `timestamptz` | Auto |

#### `pradaan_pot_ledger`
Central bank for overflow funds and poll-approved deployments.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `type` | `pot_ledger_type` | `INFLOW_OVERFLOW` or `OUTFLOW_POLL` |
| `amount` | `integer` | **Cents** |
| `reference_id` | `uuid` | FK → `donations.id` (inflow) or `polls.id` (outflow) |
| `created_at` | `timestamptz` | Auto |

#### `polls`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `title` | `text` | |
| `description` | `text` | |
| `amount` | `integer` | **Cents** to deploy if resolved |
| `status` | `poll_status` | |
| `created_by` | `uuid` | FK → `profiles.id` (Admin only) |
| `ends_at` | `timestamptz` | |

#### `poll_options`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `poll_id` | `uuid` | FK → `polls.id` |
| `label` | `text` | |

#### `poll_votes`
Enforces strict 1-vote-per-user via database constraint.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `poll_id` | `uuid` | FK → `polls.id` |
| `user_id` | `uuid` | FK → `profiles.id` |
| `option_id` | `uuid` | FK → `poll_options.id` |
| UNIQUE | `(poll_id, user_id)` | Database-enforced, cannot be bypassed |

### Views

#### `donor_analytics`
A real-time computed view. No caching, no materialization — always reads live data.

```sql
-- What it computes per donor_id:
SELECT
  donor_id,
  SUM(amount) AS total_donated_cents,
  COUNT(DISTINCT drive_id) AS total_drives_supported
FROM donations
GROUP BY donor_id;
```

### Triggers

#### `on_auth_user_created`
Fires `AFTER INSERT` on `auth.users`. Automatically inserts a matching row into `public.profiles` so the application always has a profile for every authenticated user.

```sql
-- Pseudocode of the trigger function:
INSERT INTO public.profiles (id, email, role)
VALUES (NEW.id, NEW.email, 'DONOR'); -- default role, updated during onboarding
```

---

## The Pradaan Pot (Overflow Engine)

This is the most critical business logic in the platform.

### The Problem

Traditional donation drives close the moment they hit 100% of their goal and redirect extra donations. Pradaan keeps drives open until their `ends_at` deadline. This means a popular drive can receive donations **after its financial goal is already met**.

### The Rule

> Any donation that causes `drives.current_amount` to exceed `drives.target_amount` — or any donation made while `current_amount >= target_amount` — must have its **overflow portion** routed to the Pradaan Pot.

### The Math

```
overflow_amount = MAX(0, (existing_amount + donation_amount) - target_amount)
drive_credit    = donation_amount - overflow_amount
```

**Example:**
- Drive target: ₹10,000 (= 1,000,000 cents)
- Current amount: ₹9,800 (= 980,000 cents)
- New donation: ₹500 (= 50,000 cents)

```
drive_credit    = 50,000 - MAX(0, (980,000 + 50,000) - 1,000,000)
               = 50,000 - 30,000
               = 20,000 cents  → credited to drives.current_amount
overflow_amount = 30,000 cents → INFLOW_OVERFLOW in pradaan_pot_ledger
```

### Implementation

The overflow calculation runs inside a **PostgreSQL RPC function** (`donate_with_overflow`) to guarantee atomicity. The logic:

1. `SELECT FOR UPDATE` on the drive row (prevents race conditions on concurrent donations).
2. Compute `overflow_amount`.
3. `UPDATE drives SET current_amount = current_amount + drive_credit`.
4. `INSERT INTO donations` (full `donation_amount` — the ledger records what the donor gave).
5. If `overflow_amount > 0`: `INSERT INTO pradaan_pot_ledger (type='INFLOW_OVERFLOW', amount=overflow_amount, reference_id=donation_id)`.
6. If `source = WALLET`: `UPDATE donor_profiles SET wallet_balance = wallet_balance - donation_amount WHERE wallet_balance >= donation_amount` (with a CHECK to prevent negative balance).

All six steps are a single atomic transaction. If any step fails, the entire donation is rolled back.

---

## Dynamic Certificates

Donation certificates are **never stored** as PDF files or URL strings in the database. This is a deliberate architectural choice:

1. **No stale URLs**: A stored PDF URL can break if storage buckets change.
2. **Always accurate**: A dynamically generated certificate always reflects the current state of the donation record.
3. **No storage costs**: No S3/Supabase Storage buckets needed for certificates.

### Two Certificate Surfaces

#### 1. Email Certificate (Server-side bytes)
When a donation is confirmed, the Server Action calls a certificate generator that:
- Reads the donation record, donor name, drive title, and amount.
- Renders an HTML template server-side.
- Uses a headless PDF library (e.g., `@react-pdf/renderer` or `puppeteer`) to produce raw bytes in memory.
- Attaches those bytes to the transactional email (Resend/SendGrid) as a PDF attachment — **never written to disk**.

#### 2. Dashboard Certificate (Frontend UI block)
The donor dashboard has a `/donor/certificates` route that:
- Fetches all past donations server-side.
- Renders a beautiful, print-optimized React component for each donation.
- The component uses `@media print` CSS to produce a clean, printable layout.
- A "Download / Print" button triggers `window.print()` scoped to the certificate block.

**No external PDF service. No stored files. No breaking URLs.**

---

## Governance Voting

The Pradaan Pot accumulates overflow funds over time. The community decides how those funds are deployed through a transparent polling system.

### Flow

```
Admin creates poll  →  Poll goes ACTIVE  →  Donors vote (1 vote each)
       ↓
Poll ends (ends_at passes)  →  Admin resolves winning option
       ↓
Winning org receives funds  →  pradaan_pot_ledger OUTFLOW_POLL entry created
```

### Constraints

- **1 vote per user**: Enforced by `UNIQUE(poll_id, user_id)` at the database level. The application layer cannot bypass this — even a bug in the Server Action cannot create two votes for the same user on the same poll.
- **Only verified donors vote**: RLS policy gates `INSERT` on `poll_votes` to users whose `profiles.role = 'DONOR'`.
- **Admin-only poll creation**: RLS policy gates `INSERT` on `polls` to users whose `profiles.role = 'ADMIN'`.

---

## Project Structure

```
pradaan-portal/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout — ThemeProvider, fonts, global nav
│   │   ├── page.tsx                # Public homepage — active drives grid
│   │   ├── globals.css             # Tailwind base + CSS variables for themes
│   │   ├── (auth)/                 # Route group (no URL segment)
│   │   │   ├── login/page.tsx      # /login
│   │   │   └── signup/page.tsx     # /signup — role selection (DONOR / ORG)
│   │   ├── admin/                  # /admin — Admin portal
│   │   │   ├── layout.tsx          # Admin shell with sidebar nav
│   │   │   ├── page.tsx            # Dashboard overview
│   │   │   ├── orgs/page.tsx       # Approve/reject org accounts
│   │   │   ├── drives/page.tsx     # Manage drive statuses
│   │   │   └── polls/
│   │   │       ├── page.tsx        # List polls
│   │   │       └── new/page.tsx    # Create poll form
│   │   ├── donor/                  # /donor — Donor dashboard
│   │   │   ├── layout.tsx          # Donor shell
│   │   │   ├── page.tsx            # Wallet balance + recent activity
│   │   │   ├── donate/page.tsx     # Browse drives + donation flow
│   │   │   ├── certificates/page.tsx # Dynamic certificate UI
│   │   │   └── polls/page.tsx      # Vote on active governance polls
│   │   ├── org/                    # /org — Organization dashboard
│   │   │   ├── layout.tsx          # Org shell
│   │   │   ├── page.tsx            # Drive metrics overview
│   │   │   └── drives/
│   │   │       ├── page.tsx        # List org's drives
│   │   │       └── new/page.tsx    # Create drive form
│   │   └── api/                    # Route Handlers (HTTP verb contracts)
│   │       ├── stripe/
│   │       │   └── webhook/route.ts  # Stripe webhook receiver
│   │       └── certificates/
│   │           └── [donationId]/route.ts  # PDF byte stream for email
│   ├── components/
│   │   ├── navbar.tsx              # Top navigation bar
│   │   ├── theme-toggle.tsx        # Light/dark mode toggle (Client Component)
│   │   ├── drive-card.tsx          # Fundraising drive card with progress bar
│   │   └── certificate-block.tsx  # Print-ready certificate UI
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts           # createServerClient (cookies — for Server Components & Actions)
│   │   │   └── client.ts           # createBrowserClient (for Client Components)
│   │   ├── stripe.ts               # Stripe SDK instance (server-only)
│   │   └── money.ts                # toCents / toRupees / formatCurrency helpers
│   └── types/
│       ├── database.ts             # Auto-generated Supabase types (supabase gen types)
│       └── index.ts                # Domain types (DonationWithDrive, PollWithOptions, etc.)
├── public/                         # Static assets
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── .env.local                      # Never committed
```

---

## Authentication & Role Model

Supabase Auth manages sessions via secure HTTP-only cookies (via `@supabase/ssr`). Three distinct user roles drive authorization:

| Role | Can Do |
|---|---|
| `DONOR` | Top-up wallet, donate to drives, view certificates, vote on polls |
| `ORGANIZATION` | Create drives (subject to Admin approval), view their drive metrics |
| `ADMIN` | Approve orgs, change drive statuses, create governance polls, resolve polls |

### Onboarding Flow

1. User signs up via email/password (Supabase Auth).
2. The `on_auth_user_created` trigger creates a `profiles` row with a default role.
3. The `/signup` page shows a role-selection step (DONOR or ORGANIZATION).
4. A Server Action updates `profiles.role` and inserts into the corresponding `donor_profiles` or `org_profiles` table.
5. The user is redirected to their role-appropriate dashboard.

### Route Protection

Middleware (`src/middleware.ts`) intercepts all requests:
- Refreshes the Supabase session cookie.
- Reads `profiles.role` from the session JWT claims.
- Redirects unauthenticated users to `/login`.
- Redirects users to their role-appropriate root if they attempt to access another role's routes.

---

## Environment Variables

Create `.env.local` at the project root (never commit this file):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-only, never expose to client

# Stripe (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # From `stripe listen --forward-to localhost:3000/api/stripe/webhook`
```

> `NEXT_PUBLIC_` prefixed variables are bundled into client JS. Never put secret keys with this prefix.

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project with the schema deployed (all tables, enums, triggers, views already live)
- Stripe account in Test Mode with webhook configured

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Stripe Webhook (Local Dev)

```bash
# Install Stripe CLI, then:
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret output and set it as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

### Generate Supabase Types

```bash
npx supabase gen types typescript --project-id your-project-id > src/types/database.ts
```

Re-run this command whenever the database schema changes.

---

## Key Next.js 16 Breaking Changes

This project runs Next.js **16.2.6**. The following APIs differ from older versions and are enforced throughout the codebase:

### `params` and `searchParams` are now Promises

In Next.js 15+, the `params` and `searchParams` props passed to `page.tsx` and `layout.tsx` are **Promises**, not plain objects. You must `await` them.

```tsx
// CORRECT (Next.js 16)
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // ...
}

// WRONG — will throw in Next.js 16
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params; // Error: params is a Promise
}
```

### Server Actions use `'use server'` directive

Server Actions must be defined with the `'use server'` directive inside the function body or at the top of a dedicated file. They are called from Client Components via `useActionState` (formerly `useFormState`).

### `useFormState` → `useActionState`

`useFormState` from `react-dom` is deprecated. Use `useActionState` from `react` instead.

```tsx
// CORRECT
import { useActionState } from 'react';

// DEPRECATED
import { useFormState } from 'react-dom';
```

### Instant Navigation

For client-side navigations that feel instant, export `unstable_instant` from the route file. Suspense alone is insufficient in Next.js 16 for perceived performance improvements.

---

## License

Private repository — all rights reserved.
