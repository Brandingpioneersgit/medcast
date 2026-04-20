import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { generateMeta } from "@/lib/utils/seo";

export const revalidate = 86400;

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Privacy Policy",
    description:
      "How Medcasts collects, uses and protects your medical data. GDPR-compliant, encrypted at rest, deleted on request.",
    path: "/privacy-policy",
    locale,
  });
}

export default async function PrivacyPolicyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8 py-12 md:py-16">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            Last updated · {new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1
            className="display display-tight"
            style={{
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              lineHeight: 1,
              fontWeight: 400,
              letterSpacing: "-0.03em",
            }}
          >
            Privacy <span className="italic-display">policy.</span>
          </h1>
          <p className="lede mt-4">
            How Medcasts collects, uses and protects your medical data.
          </p>
        </div>
      </div>

      <article className="py-12 md:py-16">
        <div className="mx-auto w-full max-w-[48rem] px-5 md:px-8">
          <div className="prose-editorial">
            <h2>What we collect</h2>
            <p>
              When you contact us, request a quote, or upload reports, we collect: your name,
              contact details, country, and any medical information you choose to share —
              including diagnoses, scans, lab results, and treatment history.
            </p>

            <h2>How we use it</h2>
            <p>
              We use this data <strong>only</strong> to match you with appropriate hospitals
              and specialists, prepare treatment quotes, and coordinate your care. We do not
              sell your data. Ever.
            </p>

            <h2>Who sees it</h2>
            <p>
              Your case is visible to: the assigned Medcasts case manager, the medical
              specialist reviewing your reports, and (with your explicit approval) the
              hospital you choose to proceed with. Nobody else.
            </p>

            <h2>Storage & encryption</h2>
            <p>
              Reports are encrypted at rest using AES-256, transmitted over TLS 1.3, and
              stored on EU/India region cloud infrastructure depending on your jurisdiction.
              Access is logged.
            </p>

            <h2>Retention & deletion</h2>
            <p>
              Inquiries are kept for 24 months unless you ask us to delete sooner. Reports
              uploaded for a second opinion are deleted 30 days after the opinion is
              delivered.
            </p>

            <h2>Your rights</h2>
            <p>
              Under GDPR (EU), you have the right to access, correct, port, or delete your
              data at any time. Email{" "}
              <a href="mailto:privacy@medcasts.com">privacy@medcasts.com</a> and we&apos;ll
              respond within 7 days.
            </p>

            <h2>Cookies & analytics</h2>
            <p>
              We use a single first-party cookie to remember your language and currency. With
              your consent (via the consent banner), we also load PostHog and Plausible for
              anonymous usage analytics. You can decline both.
            </p>

            <h2>Contact</h2>
            <p>
              Questions? Reach our Data Protection Officer at{" "}
              <a href="mailto:dpo@medcasts.com">dpo@medcasts.com</a> or via{" "}
              <Link href="/contact">our contact page</Link>.
            </p>
          </div>
        </div>
      </article>
    </>
  );
}
