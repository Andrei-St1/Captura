# Captura — Project Documentation

> Event photo & video sharing SaaS. Owners create albums, generate QR codes, guests scan and upload. Built with Next.js 16, Supabase, Stripe, Cloudflare R2.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Auth + DB | Supabase |
| Payments | Stripe |
| File Storage | Cloudflare R2 (S3-compatible) |
| QR Codes | `qrcode` npm package |
| Icons | Google Material Symbols (font) |
| Fonts | Noto Serif + Manrope (Google Fonts) |

---

## Environment Variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=album-media
NEXT_PUBLIC_R2_PUBLIC_URL=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Database Schema (Supabase)

### `plans`
```sql
id              text primary key   -- 'starter' | 'pro' | 'business'
name            text
price_month     integer            -- cents (999 = $9.99)
max_albums      integer
storage_gb      integer
stripe_price_id text
```
Seeded with 3 plans: Starter ($9.99, 3 albums, 50GB), Pro ($24.99, 10 albums, 200GB), Business ($49.99, 30 albums, 500GB).

### `subscriptions`
```sql
id                      uuid primary key
user_id                 uuid references auth.users unique
plan_id                 text references plans
status                  text   -- 'active' | 'canceled' | 'past_due'
stripe_customer_id      text unique
stripe_subscription_id  text unique
current_period_end      timestamptz
created_at              timestamptz
```
Written exclusively by the Stripe webhook using the service role key.

### `albums`
```sql
id               uuid primary key
owner_id         uuid references auth.users
title            text
description      text
location         text
welcome_message  text         -- legacy, not used in UI anymore
cover_url        text         -- R2 URL: albums/{id}/cover/{filename}
open_date        timestamptz
close_date       timestamptz
allocated_gb     integer
used_bytes       bigint       -- updated on every upload/delete
show_gallery     boolean      -- guests can see each other's uploads
status           text         -- 'active' | 'archived' | 'deleted'
qr_code_url      text         -- legacy, not used
created_at       timestamptz
```

### `qr_codes`
```sql
id         uuid primary key
album_id   uuid references albums
token      text unique        -- 8-char base64url, used in /join/{token}
label      text               -- e.g. "Ceremony guests"
enabled    boolean
expires_at timestamptz        -- optional expiry
created_at timestamptz
```
A default QR code is auto-created when an album is created. Multiple QR codes per album are supported.

### `media`
```sql
id             uuid primary key
album_id       uuid references albums
uploader_name  text
file_url       text           -- R2 public URL
file_path      text           -- R2 key: albums/{album_id}/{timestamp}-{filename}
file_type      text           -- 'image' | 'video'
file_size      bigint
mime_type      text
created_at     timestamptz
```

---

## File Storage (Cloudflare R2)

Bucket: `album-media`

| Path | Purpose |
|---|---|
| `albums/{album_id}/{timestamp}-{filename}` | Guest uploads |
| `albums/{album_id}/cover/{timestamp}-{filename}` | Album cover photo |

Public URL format: `${NEXT_PUBLIC_R2_PUBLIC_URL}/{path}`

---

## Route Structure

### Public routes
| Route | Description |
|---|---|
| `/` | Landing page (homepage) |
| `/pricing` | Pricing page (reads from `plans` table) |
| `/login` | Login |
| `/register` | Register |
| `/forgot-password` | Request password reset email |
| `/reset-password` | Set new password (from email link) |
| `/join/[token]` | Guest welcome page (QR code destination) |
| `/join/[token]/upload` | Guest upload page |
| `/join/[token]/gallery` | Guest gallery (if show_gallery enabled) |

### Protected routes (require auth)
| Route | Description |
|---|---|
| `/dashboard` | Main dashboard with stats + album cards |
| `/albums` | Album list |
| `/albums/create` | Create new album |
| `/albums/[id]` | Album detail (uploads, QR codes, stats) |
| `/albums/[id]/edit` | Edit album settings |
| `/albums/[id]/welcome` | Customize guest welcome page |
| `/settings` | Profile, password, billing |

### API routes
| Route | Description |
|---|---|
| `POST /api/upload` | Guest file upload → R2 + media table |
| `POST /api/upload-cover` | Album cover upload → R2 |
| `POST /api/stripe/webhook` | Stripe events → subscriptions table |

---

## Key Files

```
src/
├── proxy.ts                         # Route protection middleware (Next.js 16 convention)
├── lib/
│   ├── supabase/client.ts           # Browser Supabase client
│   ├── supabase/server.ts           # Server Supabase client (SSR)
│   ├── supabase/service.ts          # Service role client (bypasses RLS)
│   ├── stripe.ts                    # Stripe singleton
│   ├── r2.ts                        # Cloudflare R2 S3 client
│   ├── qr.ts                        # QR code generation + token generation
│   └── subscription.ts             # getSubscriptionLimits() utility
├── app/
│   ├── auth/actions.ts              # login, register, logout server actions
│   ├── albums/actions.ts            # createAlbum, updateAlbum, deleteAlbum, deleteMedia, setAlbumStatus, updateWelcomePage
│   ├── albums/qr-actions.ts         # createQRCode, toggleQRCode, regenerateQRToken, deleteQRCode, updateQRLabel
│   ├── stripe/actions.ts            # createCheckoutSession, createPortalSession
│   └── settings/actions.ts         # updateProfile, updatePassword
```

---

## Stripe Integration

- **Checkout**: `createCheckoutSession(planId)` server action → Stripe hosted checkout → webhook creates subscription row
- **Webhook** (`/api/stripe/webhook`): handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- **Portal**: `createPortalSession()` server action → Stripe billing portal
- **Webhook secret**: obtained from `stripe listen --forward-to localhost:3000/api/stripe/webhook` for local dev
- **Important**: Stripe API version is `2025-03-31.basil` — `current_period_end` may be null in this version, handled with null guard

---

## Auth Flow

- Supabase email/password auth
- After register: redirects to `/dashboard` (email confirmation optional)
- After login: redirects to `/dashboard`
- Forgot password: `resetPasswordForEmail` → email link → `/reset-password` → `updateUser` → sign out → `/login`
- Proxy middleware (`src/proxy.ts`) handles redirects:
  - Unauthenticated on protected routes → `/login`
  - Authenticated on auth routes → `/dashboard`

---

## Subscription Limits Utility

`getSubscriptionLimits(userId)` in `src/lib/subscription.ts` returns:
```ts
{
  hasActiveSubscription: boolean,
  plan: { id, name, maxAlbums, storageGb } | null,
  usage: { albumsCount, allocatedGb, usedStorageBytes, usedStorageGb, albumsPercent, storagePercent },
  limits: { canCreateAlbum, remainingAlbums, remainingStorageGb }
}
```
Used in: dashboard, settings, create album page.

---

## Design System

- **Colors**: Custom Tailwind v4 theme in `globals.css` — `surface`, `primary` (#7d5070 mauve), `secondary` (#735a31), `on-surface`, `outline-variant`, etc.
- **Fonts**: Noto Serif (headings, italic accents) + Manrope (body)
- **Icons**: Material Symbols Outlined (font-based)
- **Pattern**: Light warm cream (`#fcf9f8`) backgrounds for owner pages, gradient (`violet → purple → rose`) for guest-facing pages
- **Login/Register**: Light theme with split panel (pastel gradient left, white form right)

---

## What's Been Built

- ✅ Landing page (hero, how it works, features, pricing, CTA)
- ✅ Auth (login, register, logout, forgot password, reset password)
- ✅ Route protection middleware
- ✅ Stripe billing (checkout, webhook, portal) with 3 plans
- ✅ Pricing page (reads from DB, shows current plan)
- ✅ Dashboard (real subscription + usage data)
- ✅ Album CRUD (create, edit, delete, archive/reopen)
- ✅ Welcome page customizer (cover photo, description, location)
- ✅ Multiple QR codes per album (create, toggle, regenerate, delete, label)
- ✅ Guest join page (`/join/[token]`) — editorial split layout
- ✅ Guest upload (`/join/[token]/upload`) — drag & drop, progress, multiple files
- ✅ Guest gallery (`/join/[token]/gallery`) — grid + lightbox + download
- ✅ Owner media view (album detail) — grid + lightbox + delete
- ✅ File storage on Cloudflare R2
- ✅ Storage enforcement (album creation limits, upload limits)
- ✅ `getSubscriptionLimits()` utility
- ✅ Settings page (profile, password change with current password verify, billing)
- ✅ Real media counts on album cards

---

## What Can Be Done Next

### High priority
- [ ] **Deploy to Vercel** — set production env vars, update `NEXT_PUBLIC_APP_URL`, add production Supabase redirect URLs, add Stripe production webhook endpoint
- [ ] **Email notifications** — notify album owner when guests upload (use Resend or Supabase edge functions)
- [ ] **Post-checkout success banner** — dashboard shows a welcome message after Stripe redirect (`?checkout=success` param already set)
- [ ] **Email confirmation** — handle Supabase email confirmation flow after register

### Features
- [ ] **Album sorting & filtering** — sort by date, status, name on `/albums` page
- [ ] **Download all** — zip download of all media in an album (owner)
- [ ] **Guest name required toggle** — album owner can force guests to enter their name before uploading
- [ ] **QR code expiry setter** — UI to set `expires_at` on a QR code
- [ ] **Album cover as thumbnail** — show `cover_url` image on album cards instead of color gradient
- [ ] **Media count on album detail stats** — "Media files" stat card shows real count but needs live update after delete
- [ ] **Mobile hamburger menu** — homepage and pricing navbar collapse on small screens

### Bigger features
- [ ] **Notifications center** — bell icon in dashboard shows recent guest activity
- [ ] **Album activity log** — who joined, who uploaded, when
- [ ] **Guest can see own uploads** — when `show_gallery = false`, guests see only their own uploads instead of a blocked gallery
- [ ] **Bulk delete** — owner selects multiple media to delete at once
- [ ] **Video thumbnail generation** — show a frame from videos instead of play button overlay
- [ ] **Album templates** — preset welcome page styles (wedding, birthday, corporate)
- [ ] **Custom domain per album** — e.g. `wedding.captura.app/sarah-james`

### Production checklist
- [ ] Add `NEXT_PUBLIC_APP_URL` production value
- [ ] Add production Stripe price IDs (switch from test to live keys)
- [ ] Add Stripe live webhook endpoint in Stripe dashboard
- [ ] Add production domain to Supabase allowed redirect URLs
- [ ] Set R2 CORS policy for production domain
- [ ] Review Supabase RLS policies for production
- [ ] Add `allowedDevOrigins` only for dev (remove from production config)

---

## Local Dev Commands

```bash
npm run dev          # Start dev server at localhost:3000
stripe listen --forward-to localhost:3000/api/stripe/webhook  # Forward Stripe webhooks
```

---

## Notes

- Next.js 16 uses `proxy.ts` (not `middleware.ts`) for request interception
- Stripe API version `2025-03-31.basil` — `current_period_end` can be null, always null-guard it
- R2 uploads go through `/api/upload` (not server actions) to avoid 1MB body limit
- QR join URLs use token (`/join/{token}`), NOT album ID — tokens can be regenerated without losing album data
- `navigator.clipboard` requires HTTPS — all copy buttons have `execCommand` fallback for local dev on mobile
- Password reset signs the user out after completion (security — prevents auto-login from reset link)
- Supabase `media(count)` join used to get media counts without extra queries
