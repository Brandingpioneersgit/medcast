# MedCasts — Deployment Runbook

Target: **Cloudflare Pages** (frontend + edge) + **Supabase** (Postgres) + **Cloudinary** (images) + **Resend** (email) + **OpenRouter** (AI).

## 0. Pre-flight checks

Before you touch anything:

```bash
# Typecheck + build
npx tsc --noEmit
DATABASE_URL="postgres://fake:fake@localhost:1/fake" npm run build

# Health check locally
curl -s http://localhost:3000/api/health | jq
# expect: database.ok=true, email.provider=resend, upload.provider=cloudinary, ai.enabled=true
```

## 1. One-time setup (10 min)

### 1a. Cloudflare account

You already have:
- Account ID: in `.env.local` as `CLOUDFLARE_ACCOUNT_ID`
- API Token (`cfut_…`) in `.env.local` as `CLOUDFLARE_API_TOKEN`

**⚠ Rotate the "Global API Key" (`cfk_…`) before going live.** Use a scoped API Token instead, limited to:
- `Zone:Read`, `Zone:DNS:Edit` (on the `medcasts.com` zone)
- `Workers Scripts:Edit`, `Pages:Edit`
- `Account Settings:Read`, `R2 Storage:Edit`

Create at dash.cloudflare.com → My Profile → API Tokens → Create Token → Custom.

### 1b. Domain on Cloudflare DNS

1. dash.cloudflare.com → Add a site → `medcasts.com` → Free plan.
2. At your registrar, change nameservers to the two Cloudflare ones.
3. Wait 5–30 min for propagation. (Status goes green when done.)

### 1c. KV namespace for ISR cache

```bash
npx wrangler kv:namespace create MC_CACHE
```

Copy the returned `id` into `wrangler.toml` → `kv_namespaces.id`.

### 1d. R2 bucket (for patient reports + doctor credentials)

```bash
npx wrangler r2 bucket create medcasts-assets
```

### 1e. Turnstile widget (captcha on forms)

1. dash.cloudflare.com → Turnstile → Add site → `medcasts.com`, `*.medcasts.com`.
2. Copy sitekey + secret. Add to `.env.local` and Pages secrets:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`

## 2. Build for Cloudflare Pages

Cloudflare Pages doesn't run `next build` directly — use the OpenNext adapter:

```bash
npm install -D @opennextjs/cloudflare
npx @opennextjs/cloudflare build
```

This produces `.open-next/` with a Worker + static assets.

## 3. Set runtime secrets

Secrets *must not* live in `wrangler.toml`. Upload them separately:

```bash
# Required
npx wrangler pages secret put DATABASE_URL --project-name medcasts
npx wrangler pages secret put RESEND_API_KEY --project-name medcasts
npx wrangler pages secret put EMAIL_FROM --project-name medcasts
npx wrangler pages secret put INQUIRY_NOTIFY_EMAIL --project-name medcasts
npx wrangler pages secret put CLOUDINARY_CLOUD_NAME --project-name medcasts
npx wrangler pages secret put CLOUDINARY_API_KEY --project-name medcasts
npx wrangler pages secret put CLOUDINARY_API_SECRET --project-name medcasts
npx wrangler pages secret put OPENROUTER_API_KEY --project-name medcasts
npx wrangler pages secret put JOBS_TOKEN --project-name medcasts

# QStash (scheduled jobs + follow-up emails)
npx wrangler pages secret put QSTASH_URL --project-name medcasts
npx wrangler pages secret put QSTASH_TOKEN --project-name medcasts
npx wrangler pages secret put QSTASH_CURRENT_SIGNING_KEY --project-name medcasts
npx wrangler pages secret put QSTASH_NEXT_SIGNING_KEY --project-name medcasts

# Recommended
npx wrangler pages secret put NEXT_PUBLIC_TURNSTILE_SITE_KEY --project-name medcasts
npx wrangler pages secret put TURNSTILE_SECRET_KEY --project-name medcasts
npx wrangler pages secret put NEXT_PUBLIC_SENTRY_DSN --project-name medcasts
```

Paste each secret when prompted. You can also set them via dashboard → Pages → medcasts → Settings → Environment variables.

## 4. First deploy

```bash
npx @opennextjs/cloudflare deploy
# or
npx wrangler pages deploy .open-next/assets --project-name medcasts
```

First deploy creates the project. Subsequent deploys push to the same URL.

Preview URL example: `https://<hash>.medcasts.pages.dev`.

## 5. Wire the custom domain

In Pages → medcasts → Custom domains:
- Add `medcasts.com` → confirms DNS automatically (since the zone is on Cloudflare).
- Add `www.medcasts.com` with redirect to apex.

TLS is issued automatically (~1 min).

## 6. Configure Cron (via QStash — already wired)

The app uses **Upstash QStash** for scheduled + delayed HTTP calls. Already configured in `.env.local`.

### 6a. Register the recurring jobs runner

```bash
node --env-file=.env.local --import tsx scripts/setup-qstash.ts
```

This registers `*/5 * * * *` → `https://medcasts.com/api/jobs/run`. The endpoint verifies the `Upstash-Signature` header against `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY`. Bearer-token auth still works for manual calls.

### 6b. Patient follow-up sequence (already live)

When `POST /api/v1/inquiry` succeeds, `scheduleInquiryFollowups()` publishes four QStash messages via `publishJSON`:
- day+1 — personalized quote
- day+3 — patient stories
- day+7 — free second-opinion offer
- day+14 — final check-in

Each message POSTs to `/api/jobs/followup`, verified via QStash signature, then sends email through Resend. Messages are deduped by `inquiry-{id}-{step}` so double-submit is safe.

If QStash isn't configured, `scheduleInquiryFollowups` silently no-ops — dev on localhost keeps working without a tunnel.

## 7. Warm the cache

```bash
# First visit pre-renders the ISR cache for common routes
for p in / /hospitals /doctors /specialties /treatments /contact /second-opinion; do
  curl -s -o /dev/null "https://medcasts.com${p}" &
done
wait
```

## 8. Post-deploy checks

```bash
# All these should return 200
for p in / /api/health /hospitals /doctors /sitemap.xml /robots.txt; do
  curl -s -o /dev/null -w "%{http_code}  %{time_total}s  %s\n" "https://medcasts.com${p}"
done

# Real user monitor — Core Web Vitals budget
npx lighthouse https://medcasts.com --preset=desktop --only-categories=performance
# Aim: LCP < 1.8s, CLS < 0.05, INP < 150ms
```

## 9. Rollback

```bash
# List recent deployments
npx wrangler pages deployments list --project-name medcasts

# Roll back to previous
npx wrangler pages deployments rollback <deployment-id> --project-name medcasts
```

## 10. DNS records you'll want

| Type | Name | Value | Notes |
|------|------|-------|-------|
| A / CNAME | @ | managed by CF Pages | auto |
| CNAME | www | @ | redirect to apex |
| MX | @ | `feedback-smtp.resend.com` prio 10 | for Resend inbound replies |
| TXT | @ | `v=spf1 include:amazonses.com ~all` | SPF (Resend uses SES) |
| TXT | resend._domainkey | long DKIM string from Resend | |
| TXT | _dmarc | `v=DMARC1; p=quarantine; rua=mailto:dmarc@medcasts.com` | |
| CAA | @ | `0 issue "letsencrypt.org"`, `0 issue "pki.goog"` | TLS pinning |

Swap `EMAIL_FROM=MedCasts <noreply@medcasts.com>` once SPF + DKIM verify green in the Resend dashboard.

## 11. Known follow-ups

- [ ] Rotate `CLOUDFLARE_GLOBAL_API_KEY` → replace with scoped token.
- [ ] Verify `medcasts.com` domain in Resend (swap `EMAIL_FROM` after).
- [ ] Add OpenRouter credit balance (current test-run hit `Key limit exceeded`).
- [ ] Wire `NEXT_PUBLIC_SENTRY_DSN`.
- [ ] Run `scripts/translate-specialties.ts` + equivalents for hospitals/doctors/treatments after OpenRouter credits are loaded.
- [ ] Swap in-memory rate limiter for Upstash Redis / CF KV once running multi-instance.
- [ ] Consider CF Images swap from Cloudinary (cheaper at scale, same edge).
