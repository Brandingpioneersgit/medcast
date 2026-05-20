# Doctor portrait outreach kit

## Why
Today only ~17% of the 847 active doctors have a real photo. The remaining 83%
fall back to a curated stock-portrait pool — visually obvious within 2 pages
of scrolling. Real portraits are the single highest-leverage upgrade to the
doctor grid's credibility, and most JCI-credentialed hospitals already have
high-res surgeon headshots they distribute to insurers and partners.

Hypothesis: a one-shot, low-friction email ask to top-200 hospitals yields
**300-500 real portraits** at zero licensing cost.

## Targets
Generate the current top-200 list with:

```bash
node --env-file=.env.local --import tsx scripts/outreach/export-portrait-targets.ts
```

Writes `outreach/portrait-targets-YYYYMMDD.csv`. Sort by `fallback_portrait_count`
descending — biggest visual lift comes from hospitals whose surgeons are mostly
on stock portraits.

## Email template

**Subject:** Portrait request — your {Hospital Name} surgeons featured on Medcasts

> Hello {first name if known, else "team"},
>
> I'm writing from Medcasts, the medical-travel directory you may know — we
> rank and present {Country} hospitals to international patients searching
> in 8 languages.
>
> {Hospital Name} currently has **{doctor_count} surgeons profiled** with us.
> {fallback_portrait_count} of them are using stock portraits because we
> haven't been able to source a real photo. If you can send 3–5 high-resolution
> headshots of your most-requested international-patient surgeons, we'll:
>
> 1. Replace the stock portraits within 48 hours
> 2. Pin those surgeons to the top of our {Hospital Name} doctor grid
> 3. Add a "Portraits provided by hospital" credit linking to your contact page
>
> No fee, no contract — just photos with the surgeon's name attached. Drop
> them on this intake page (no login needed):
>
> **{intake_url}**
>
> Or reply with the photos attached and we'll match them to profiles manually.
>
> Best,
> {your name}
> Editorial desk · Medcasts
> editorial@medcasts.com

Personalisation:
- Pull `fallback_portrait_count` straight from the CSV — surfaces the actual
  pain so the ask reads as informed, not generic.
- For the 72 rows with `email`: send via Resend, tracked under
  `utmCampaign=portrait-outreach-2026-q2`.
- For the 128 rows with `website` only: extract a contact form URL during a
  manual quick pass, or use the published `info@` / `contact@` pattern at the
  same domain.

## Intake page

Build at `/[locale]/hospital-portal/portraits` — accepts:
- Hospital token (signed query param, scoped to the slug)
- Multi-image dropzone (`<input type="file" multiple accept="image/*">`)
- Per-image text input: surgeon's full name (autocomplete against
  `doctors WHERE hospital_id = ?`)

POSTs to `/api/hospital-portal/portrait-upload`:
- Verifies HMAC-signed token (reuse `src/lib/tokens.ts`)
- Streams to R2 via existing `src/lib/upload/r2.ts` presigner
- On match: writes the R2 URL into `doctors.image_url`, sets
  `image_credit = "Provided by {hospital_name}"`
- On no-match: queues into a `portrait_intake_queue` table for manual review

## Intake script (manual-review path)

Until the intake page is built, accept email replies and run:

```bash
node --env-file=.env.local --import tsx scripts/outreach/match-portrait.ts \
  --hospital="medanta-medicity" \
  --doctor="Dr. Naresh Trehan" \
  --file=./inbox/medanta-trehan.jpg
```

This script (to be created) should:
1. Upload to R2 under `doctors/portraits/{slug}.jpg`
2. Set `doctors.image_url` and `doctors.image_credit` for the matched row
3. Log a row to `portrait_intake_log` with hospital_id, doctor_id, source,
   received_at — used to compute response rate per hospital tier.

## Tracking

Capture in a Linear / Sheet:
| sent_at | hospital | email_used | replied | photos_received | applied_at |

Target: 25%+ reply rate from tier-1 (rating ≥ 4.5), 10%+ from tier-2.
Below 10% means the email body is the wrong shape — A/B the subject or
add a 1-line "we already feature your hospital" preamble.

## Followups

- 7 days after no reply → resend with subject `RE: portrait request`
- 14 days after no reply → drop, mark `dropped` in the tracker
- Replies without attached photos but interested → reply with intake URL only

## Legal

- Photos provided by the hospital are presumed cleared by the hospital for
  professional-directory use. Credit on each portrait is the consideration.
- If a doctor later requests removal, set `doctors.image_url = NULL` (the
  fallback portrait kicks back in automatically) and log the request to
  `portrait_intake_log` with `removed_at`.

## What good looks like

- 30 days post-launch: doctor portraits-with-real-photo coverage rises from
  17% → 50%+ (target: ~420 of 847 doctors).
- Visible on `/[locale]/doctors` listing — fewer of the same 15 stock faces
  repeating.
- A second pass quarter+1 hits tier-2 (rating 3.8-4.4) with the same
  template — typically slower response but yields the long tail.
