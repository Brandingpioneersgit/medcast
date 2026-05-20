import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { generateMeta } from "@/lib/utils/seo";

export const revalidate = 86400;

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Terms of Service",
    description:
      "Terms governing the use of Medcasts services — case management, quotes, second opinions and travel coordination.",
    path: "/terms",
    locale,
  });
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <div style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8 py-12 md:py-16">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            Effective · {new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
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
            Terms of <span className="italic-display">service.</span>
          </h1>
          <p className="lede mt-4">
            Plain-English terms governing your use of Medcasts.
          </p>
        </div>
      </div>

      <article className="py-12 md:py-16">
        <div className="mx-auto w-full max-w-[48rem] px-5 md:px-8">
          <div className="prose-editorial">
            <h2>What we are</h2>
            <p>
              Medcasts is a medical-travel facilitator. We connect patients with
              accredited hospitals and specialists, prepare price quotes, coordinate
              second opinions, and handle visa, travel and recovery logistics.
              We are <strong>not a clinical provider</strong>. All medical care is
              delivered by partner hospitals and physicians, who hold full clinical
              responsibility.
            </p>

            <h2>Our service is free to patients</h2>
            <p>
              We are paid by partner hospitals when you choose to proceed — never by you.
              Quotes, second opinions, and travel coordination are at no cost to the
              patient.
            </p>

            <h2>Quotes are estimates</h2>
            <p>
              Treatment costs published on this site or quoted to you are good-faith
              estimates based on standard cases. Final pricing is determined by the
              treating hospital after in-person assessment.
            </p>

            <h2>Second opinions are advisory</h2>
            <p>
              Written opinions from our medical panel are advisory only and do not
              constitute a doctor-patient relationship. Always consult your treating
              physician before making clinical decisions.
            </p>

            <h2>Cancellation & refunds</h2>
            <p>
              Cancellation and refund terms are set by the chosen hospital. We will
              communicate them clearly before you commit to any payment, and assist
              with cancellation logistics where possible.
            </p>

            <h2>Acceptable use</h2>
            <p>
              You agree not to misrepresent identity, share fraudulent reports, or
              use our service for purposes other than legitimate medical inquiries.
            </p>

            <h2>Limitation of liability</h2>
            <p>
              Medcasts is not liable for clinical outcomes, hospital service quality,
              or third-party travel arrangements. Our liability is limited to the
              direct service we provide (case coordination), capped at the fees we
              receive from your chosen hospital.
            </p>

            <h2>Governing law</h2>
            <p>
              These terms are governed by the laws of India. Any disputes will be
              resolved in the courts of New Delhi.
            </p>

            <h2>Contact</h2>
            <p>
              Questions? Reach us at{" "}
              <a href="mailto:legal@medcasts.com">legal@medcasts.com</a> or via{" "}
              <Link href="/contact">our contact page</Link>.
            </p>
          </div>
        </div>
      </article>
    </>
  );
}
