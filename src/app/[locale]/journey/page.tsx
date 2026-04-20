export const revalidate = 3600;

import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { generateMeta } from "@/lib/utils/seo";
import { PortalLookupForm } from "@/components/shared/portal-lookup";
import { Compass, MessageSquare, FileText, Plane, Stethoscope, HeartHandshake } from "lucide-react";

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Your Medical Journey — From First Enquiry to Recovery",
    description: "Track every step of your treatment abroad: enquiry, second opinion, quote, visa, arrival, surgery, recovery and follow-up. Enter your journey code to continue.",
    path: "/journey",
    locale,
  });
}

const stages = [
  { icon: MessageSquare, title: "Enquiry", body: "Tell us about the patient, condition, and reports. We respond within 11 minutes with relevant specialists." },
  { icon: FileText, title: "Second opinion", body: "Board-certified specialists review reports within 48 hours at no cost. Written opinion delivered by email." },
  { icon: Stethoscope, title: "Quote & plan", body: "All-in estimate across 2–3 matched hospitals with surgeon, stay, recovery, and travel broken out." },
  { icon: Plane, title: "Visa & travel", body: "Invitation letter, visa assistance, airport pickup, accommodation near hospital — booked together." },
  { icon: HeartHandshake, title: "Treatment & recovery", body: "On-ground coordinator, interpreter, companion accommodation, and daily check-ins during recovery." },
  { icon: Compass, title: "Follow-up", body: "Structured follow-ups at 7, 30, 90 and 180 days with teleconsults, reports shared with your home doctor." },
];

export default async function JourneyIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <section
        className="py-14 md:py-16"
        style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <p
            className="mono uppercase"
            style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            Your journey
          </p>
          <h1
            className="display display-tight mt-3"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "-0.03em", lineHeight: 1 }}
          >
            Every step of your <span className="italic-display">treatment abroad</span>
          </h1>
          <p
            className="serif mt-4 max-w-2xl"
            style={{ fontSize: 19, lineHeight: 1.55, color: "var(--color-ink-muted)" }}
          >
            From first enquiry to follow-up — one coordinator, one portal, one tracking code.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto w-full max-w-[72rem] px-5 md:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.5fr,1fr]">
            <div>
              <h2 className="display mb-8" style={{ fontSize: 26, letterSpacing: "-0.02em" }}>
                Six stages, tracked end-to-end
              </h2>
              <ol className="space-y-0">
                {stages.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <li
                      key={s.title}
                      className="grid gap-5 py-6"
                      style={{
                        gridTemplateColumns: "56px 1fr",
                        borderTop: "1px solid var(--color-border)",
                      }}
                    >
                      <div
                        className="flex items-center justify-center rounded-full"
                        style={{
                          width: 44,
                          height: 44,
                          background: "var(--color-accent-soft)",
                          color: "var(--color-accent-deep)",
                        }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div
                          className="mono uppercase"
                          style={{ fontSize: 9.5, letterSpacing: "0.1em", color: "var(--color-ink-subtle)" }}
                        >
                          Step {String(i + 1).padStart(2, "0")}
                        </div>
                        <h3 className="display mt-1.5" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>
                          {s.title}
                        </h3>
                        <p
                          className="serif mt-1.5"
                          style={{ fontSize: 16, lineHeight: 1.55, color: "var(--color-ink-muted)" }}
                        >
                          {s.body}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <aside className="space-y-5">
              <div className="paper" style={{ padding: 22, background: "var(--color-accent-mist)" }}>
                <div
                  className="mono uppercase"
                  style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-accent)" }}
                >
                  Already enquired?
                </div>
                <h3 className="display mt-2" style={{ fontSize: 20, letterSpacing: "-0.02em" }}>
                  Enter your journey code
                </h3>
                <p className="mt-2 text-[13.5px]" style={{ color: "var(--color-ink-muted)" }}>
                  Use the 8-character code we emailed after your enquiry to see your current stage, next steps and documents.
                </p>
                <div className="mt-4">
                  <PortalLookupForm />
                </div>
              </div>

              <div className="paper" style={{ padding: 22 }}>
                <div
                  className="mono uppercase"
                  style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                >
                  Start fresh
                </div>
                <h3 className="display mt-2" style={{ fontSize: 20, letterSpacing: "-0.02em" }}>
                  Get your free quote
                </h3>
                <p className="mt-2 text-[13.5px]" style={{ color: "var(--color-ink-muted)" }}>
                  No account, no fees. Reply in 11 minutes from verified hospitals.
                </p>
                <Link
                  href="/contact"
                  className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-medium"
                  style={{ color: "var(--color-accent)" }}
                >
                  Start an enquiry →
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
