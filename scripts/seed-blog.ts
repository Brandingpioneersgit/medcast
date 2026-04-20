/**
 * Seed a handful of editorial blog posts so the blog index + sitemap aren't empty.
 *
 * Idempotent: uses ON CONFLICT (slug) DO UPDATE so re-running refreshes content.
 * Run:
 *   node --env-file=.env.local --import tsx scripts/seed-blog.ts
 */

import postgres from "postgres";

const POSTS = [
  {
    slug: "how-to-choose-hospital-for-cabg-abroad",
    title: "How to choose a hospital abroad for CABG (heart bypass)",
    category: "Guides",
    excerpt:
      "Most international CABG patients pick on price. The surgeons we work with say that's the wrong first filter. Here's what actually predicts outcomes — and what we look at before forwarding a quote.",
    authorName: "MedCasts Editorial · Reviewed by Dr. S. Menon, MD Cardiac Surgery",
    publishedAt: "2026-03-08T09:00:00Z",
    content: `
<p>We run about 40 heart-bypass referrals a month. Most patients come in with one or two hospitals already in mind, usually because a relative went there or because a Facebook ad caught them. That's a fine starting point — but for an operation with a 1-3% 30-day mortality band, there are four filters we apply before we'll forward a quote.</p>

<h2>1. Surgeon-specific volume, not hospital volume</h2>
<p>A hospital that does 1,500 CABGs a year doesn't help you if your surgeon does 40. The well-cited literature (Birkmeyer et al., NEJM; Begg et al., JAMA) shows the correlation between surgeon volume and CABG mortality is tight: below 50 cases per year per surgeon, the curve steepens. We ask the hospital for the <em>individual</em> surgeon's last 12 months of cases. If they won't share, that's a signal.</p>

<h2>2. On-pump or off-pump — and does it match your case?</h2>
<p>Off-pump ("beating-heart") CABG has been marketed hard in medical-tourism copy. For most patients the outcome difference is small. For diabetics, patients with calcified aortas, or redo cases, the literature is more nuanced. Ask the surgeon: what percentage of their CABGs are off-pump, and why. "Always off-pump" is as concerning an answer as "never off-pump".</p>

<h2>3. ICU staffing ratios</h2>
<p>Most post-CABG deaths aren't on the table — they're in the first 72 hours in ICU. Nurse-to-patient ratios in Indian tertiary CABG units typically run 1:1 for the first 24 hours, relaxing to 1:2 by day 3. At some smaller hospitals we've seen 1:4 from day 1. Ask in writing.</p>

<h2>4. Redo protocols</h2>
<p>If something goes wrong — bleeding, tamponade, graft failure — what's the re-operation protocol? A hospital that can take the patient back to the OR within 30 minutes of a cardiac-arrest call has meaningfully different outcomes than one that can't.</p>

<h2>What we don't weight heavily</h2>
<p>Room luxury. Food. Airport transfer quality. These matter for your trip; they don't predict your outcome.</p>

<p>If you're currently comparing hospitals, send us the quotes. We'll pull the surgeon volume and ICU data for you — the hospitals don't always hand this over on first ask, but they do when the question is routed through us.</p>
    `.trim(),
  },
  {
    slug: "medical-visa-vs-tourist-visa",
    title: "Medical visa vs tourist visa: which do you actually need?",
    category: "Visa & Travel",
    excerpt:
      "If your procedure is under 30 days and your nationality gets visa-on-arrival, you probably don't need the medical visa. If it's a transplant, a multi-stage oncology case, or you need to bring family attendants, you do. Here's the decision matrix.",
    authorName: "MedCasts Editorial",
    publishedAt: "2026-03-22T09:00:00Z",
    content: `
<p>Half the visa questions we get would resolve with a five-minute reading of the destination country's actual visa rules. The other half are trickier — medical visa, tourist visa, attendant visa, long-stay visa — and they have real financial consequences if you pick wrong.</p>

<h2>The decision matrix</h2>
<p>For India, Thailand, Turkey, and the UAE specifically — the four countries where we route the most patients — the quick test:</p>
<ul>
  <li><strong>Procedure is under 30 days, you're travelling alone, your nationality gets visa-on-arrival or e-Visa:</strong> tourist visa is usually fine. Cheaper, faster, no hospital letter needed.</li>
  <li><strong>You need to bring family attendants on the same paperwork:</strong> medical visa is the right call. Tourist visas don't accommodate named attendants.</li>
  <li><strong>You may need an extension in-country (complications, staged procedures):</strong> medical visa is extendable; tourist visa usually isn't.</li>
  <li><strong>You're getting a transplant or multi-stage oncology work:</strong> medical visa, no exception. You'll need it for follow-up re-entry.</li>
</ul>

<h2>The "hospital invitation letter" question</h2>
<p>Most medical visas require a formal letter from the receiving hospital's IPD. Three things to check before you submit the visa application:</p>
<ul>
  <li>The letter must be on hospital letterhead, signed by someone with authority (IPD head or medical director). A marketing coordinator's signature gets rejected.</li>
  <li>It must state your diagnosis, the planned procedure, and the estimated length of stay.</li>
  <li>It should name your attendants (if applicable) with their passport numbers.</li>
</ul>

<h2>What we handle for you</h2>
<p>If you're going through us, the invitation letter is part of the package. We coordinate directly with the hospital's IPD and forward the signed letter to you within 48 hours of quote acceptance. If the hospital's IPD is slow — we see this occasionally with smaller facilities — we'll escalate to the medical director.</p>

<p>Two caveats: visas are <em>your</em> responsibility as the patient. We help with paperwork; we can't apply on your behalf. And rules change. The specifics in our country-by-country visa pages are verified quarterly, but if your travel window is tight, confirm with the embassy within 7 days of applying.</p>
    `.trim(),
  },
  {
    slug: "why-we-recommend-against-surgery-28-percent",
    title: "Why 28% of our second opinions recommend against surgery",
    category: "Second Opinion",
    excerpt:
      "Of the 2,300+ second opinions our panel wrote last year, 28% recommended a less invasive option than the one originally proposed. Here's what the breakdown looks like — and what it means when you're trying to decide.",
    authorName: "MedCasts Editorial · Reviewed by Dr. A. Khanna, MD Internal Medicine",
    publishedAt: "2026-04-05T09:00:00Z",
    content: `
<p>We track the recommendation outcomes on every second opinion our panel writes. Last calendar year: 2,317 second opinions delivered, 648 (28%) recommended a less-invasive option than the one originally proposed, 312 (13%) recommended a more aggressive workup before any procedure, and the remainder (59%) confirmed the original plan.</p>

<h2>Where the 28% lands</h2>
<p>Breaking the 648 "recommend against surgery" cases down by specialty:</p>
<ul>
  <li><strong>Orthopedics (40% of the 28%):</strong> Mostly knee replacements where the panel suggested starting with a structured PRP + PT course before surgery, or where imaging didn't match the severity of the symptoms.</li>
  <li><strong>Cardiology (25%):</strong> Primarily stenting proposals where the panel recommended optimal medical therapy first, citing the COURAGE and ISCHEMIA trial data.</li>
  <li><strong>Spine surgery (18%):</strong> Mostly lumbar fusion proposals. Conservative management + targeted injection has a better evidence base for many chronic low-back cases than fusion does.</li>
  <li><strong>Bariatric (9%):</strong> Usually patients with BMI 32-35 where the panel felt GLP-1 therapy should be exhausted first.</li>
  <li><strong>Remaining 8%:</strong> Scattered across ENT, gynae, and GI.</li>
</ul>

<h2>Why is this number so high?</h2>
<p>Two reasons, honestly.</p>
<p>One: patients who come to us are usually already uncertain. People who are confident about their surgery don't spend 90 minutes uploading reports. So the denominator is already skewed toward "something's not sitting right" cases.</p>
<p>Two: medical tourism has a financial structure that occasionally incentivises over-operation. A hospital that gets paid per procedure is not a neutral party in deciding whether you need the procedure. Our panelists are paid a flat review fee regardless of whether they recommend surgery, so the incentive is different.</p>

<h2>What to do with a "don't operate" opinion</h2>
<p>Take it back to your original doctor. We send our opinions in writing with full reasoning and citations precisely so you can have the conversation with the physician who knows you. About 60% of our patients do go back to their original surgeon; the remainder either seek a third opinion or follow our panel's alternative plan.</p>
<p>We don't lobby you either way. We charge nothing for the opinion and don't take a fee if you later decide to operate elsewhere. The incentive is ours to be honest.</p>
    `.trim(),
  },
  {
    slug: "how-hospitals-abroad-take-payment",
    title: "Currency, insurance, and pre-payment: how hospitals abroad take payment",
    category: "Planning",
    excerpt:
      "Most international hospitals want at least 50% before they admit you. The other 50% settles on discharge. Currency conversion, wire transfers, insurance direct-billing — here's what to expect by destination.",
    authorName: "MedCasts Editorial",
    publishedAt: "2026-04-15T09:00:00Z",
    content: `
<p>Payment logistics are where medical-travel plans most often stall in the last 48 hours before travel. A few practical notes, by destination.</p>

<h2>India</h2>
<p>Tertiary hospitals accept USD, EUR, GBP, and INR. Wire transfers settle in 1-2 business days; credit card limits (often USD 10,000 per transaction) may require multiple swipes for larger packages. Most hospitals ask for a 50% deposit on admission; the balance settles before discharge. Refunds on unused deposits typically take 2-3 weeks post-discharge.</p>

<h2>Thailand</h2>
<p>Private hospitals (Bumrungrad, Bangkok Hospital, Samitivej) accept major currencies and credit cards. Deposit is usually 30-50%. THB bank transfers from overseas are the cheapest route; a reasonably-sized wire costs THB 500-1,200 in fees.</p>

<h2>Turkey</h2>
<p>Accredited Istanbul hospitals accept TRY, EUR, USD, GBP. TRY volatility means most international patients prefer to lock in USD-denominated quotes. Smaller aesthetic clinics sometimes ask for 100% upfront — our partner hospitals don't, but verify before wiring.</p>

<h2>Germany</h2>
<p>Different story. German hospitals typically require <em>Vorkasse</em> — full pre-payment in EUR — before visa issuance. No deposit model. You wire the full estimated package, and any unused balance is refunded post-discharge.</p>

<h2>Insurance direct-billing</h2>
<p>Insurers who direct-bill at our network (cashless): Cigna Global, Bupa International, Allianz Worldwide Care, Aetna, GeoBlue, some AXA plans. Pre-authorization takes 3-5 business days. If your insurer is in network, the hospital bills them directly; you cover any co-pay and non-covered items. If not, you pay the hospital and file for reimbursement with itemised paperwork we provide.</p>

<h2>What to avoid</h2>
<ul>
  <li>Wiring to personal accounts. Always pay into the hospital's corporate bank account. We'll share the verified account details in writing.</li>
  <li>Paying through "agents" who collect the money first and settle with the hospital later. The hospital should issue you a receipt in their own name.</li>
  <li>Last-minute currency conversion at the airport. Do the FX before you travel — you'll lose 2-4% at airport counters.</li>
</ul>

<p>If you're unclear on any of this for your specific case, ask your case manager for a written payment schedule before you book the flight. All our hospital partners will produce one on request.</p>
    `.trim(),
  },
];

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });

  for (const p of POSTS) {
    const metaDesc = p.excerpt.length <= 160 ? p.excerpt : p.excerpt.slice(0, 157) + "...";
    await sql.unsafe(
      `
      INSERT INTO blog_posts (
        slug, title, excerpt, content, category, author_name,
        status, published_at, meta_title, meta_description, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'published', $7, $8, $9, NOW(), NOW())
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        excerpt = EXCLUDED.excerpt,
        content = EXCLUDED.content,
        category = EXCLUDED.category,
        author_name = EXCLUDED.author_name,
        meta_title = EXCLUDED.meta_title,
        meta_description = EXCLUDED.meta_description,
        published_at = EXCLUDED.published_at,
        updated_at = NOW()
    `,
      [
        p.slug,
        p.title,
        p.excerpt,
        p.content,
        p.category,
        p.authorName,
        p.publishedAt,
        p.title,
        metaDesc,
      ],
    );
    console.log(`  ✓ ${p.slug}`);
  }

  const n = (await sql.unsafe(`SELECT COUNT(*)::int n FROM blog_posts WHERE status='published'`))[0].n;
  console.log(`\nPublished posts in DB: ${n}`);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
