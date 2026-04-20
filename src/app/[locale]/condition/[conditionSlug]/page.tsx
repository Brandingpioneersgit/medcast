export const revalidate = 3600;

import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { getConditionBySlug } from "@/lib/db/queries";
import { generateMeta } from "@/lib/utils/seo";
import {
  getTranslations as getContent,
  getTranslationsBatch,
  translated,
} from "@/lib/utils/translate";
import { ChevronRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWhatsAppUrl } from "@/lib/utils/whatsapp";

interface Props {
  params: Promise<{ locale: string; conditionSlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale, conditionSlug } = await params;
  const condition = await getConditionBySlug(conditionSlug);
  if (!condition) return {};
  const map = await getContent("condition", condition.id, locale);
  const name = map.name ?? condition.name;
  return generateMeta({
    title: `${name} - Treatment Options & Top Hospitals`,
    description: `Find the best treatments for ${name}. Compare hospitals, doctors, and costs. Get a free quote.`,
    path: `/condition/${conditionSlug}`,
    locale,
  });
}

export default async function ConditionPage({ params }: Props) {
  const { locale, conditionSlug } = await params;
  setRequestLocale(locale);

  const conditionRaw = await getConditionBySlug(conditionSlug);
  if (!conditionRaw) notFound();

  const tc = await getTranslations("common");

  const conditionMap = await getContent("condition", conditionRaw.id, locale);
  const condition = translated(conditionRaw, conditionMap, ["name", "description"]);

  const specialtyIds = (conditionRaw.specialties ?? []).map((cs: any) => cs.specialty.id);
  const specialtyMap = await getTranslationsBatch("specialty", specialtyIds, locale);
  const specialties = (conditionRaw.specialties ?? []).map((cs: any) => ({
    ...cs,
    specialty: translated(cs.specialty, specialtyMap[cs.specialty.id] ?? {}, ["name", "description"]),
  }));

  const treatmentIds = (conditionRaw.treatments ?? []).map((ct: any) => ct.treatment.id);
  const treatmentMap = await getTranslationsBatch("treatment", treatmentIds, locale);
  const treatments = (conditionRaw.treatments ?? []).map((ct: any) => {
    const specMap = ct.treatment.specialty
      ? specialtyMap[ct.treatment.specialty.id] ?? {}
      : {};
    const treatmentSpecialty = ct.treatment.specialty
      ? translated(ct.treatment.specialty, specMap, ["name"])
      : ct.treatment.specialty;
    return {
      ...ct,
      treatment: {
        ...translated(ct.treatment, treatmentMap[ct.treatment.id] ?? {}, ["name", "description"]),
        specialty: treatmentSpecialty,
      },
    };
  });

  const whatsappUrl = getWhatsAppUrl(
    `Hi, I need help with treatment options for ${condition.name}.`
  );

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border-soft)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-4">
          <nav className="mono text-[12px]" style={{ color: "var(--color-ink-subtle)" }} aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink">{tc("home")}</Link>
            <span className="mx-1.5">/</span>
            <Link href="/specialties" className="hover:text-ink">Specialties</Link>
            <span className="mx-1.5">/</span>
            <span style={{ color: "var(--color-ink)" }}>{condition.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="map-bg" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-12 md:py-16">
          <p
            className="mono uppercase"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            Medical condition
          </p>
          <h1
            className="display display-tight mt-4"
            style={{
              fontSize: "clamp(2.25rem, 5vw, 4.25rem)",
              lineHeight: 0.98,
              fontWeight: 400,
              letterSpacing: "-0.03em",
            }}
          >
            {firstWord(condition.name)}{" "}
            <span className="italic-display">{restOfName(condition.name)}</span>
          </h1>
          {condition.description && (
            <p
              className="serif mt-5 max-w-[44rem]"
              style={{ fontSize: 19, lineHeight: 1.5, color: "var(--color-ink-muted)" }}
            >
              {condition.description}
            </p>
          )}
        </div>
      </section>

      {/* Specialties */}
      {specialties.length > 0 && (
        <section className="py-14">
          <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
            <p
              className="mono uppercase mb-3"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              01 · Treated by
            </p>
            <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
              Related specialties
            </h2>

            <ul className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {specialties.map((cs: any) => (
                <li key={cs.specialty.id}>
                  <Link
                    href={`/specialty/${cs.specialty.slug}` as "/"}
                    className="paper flex h-full flex-col transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                    style={{ padding: 20 }}
                  >
                    <h3
                      className="serif"
                      style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.015em" }}
                    >
                      {cs.specialty.name}
                    </h3>
                    {cs.specialty.description && (
                      <p
                        className="mt-2 text-[13.5px] line-clamp-3"
                        style={{ color: "var(--color-ink-muted)", lineHeight: 1.5 }}
                      >
                        {cs.specialty.description}
                      </p>
                    )}
                    <div
                      className="mt-auto pt-4 inline-flex items-center justify-between"
                      style={{ borderTop: "1px solid var(--color-border-soft)" }}
                    >
                      <span
                        className="mono uppercase text-[10.5px]"
                        style={{ letterSpacing: "0.12em", color: "var(--color-accent)" }}
                      >
                        View specialty
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 mirror-x" style={{ color: "var(--color-ink-subtle)" }} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Recommended treatments */}
      {treatments.length > 0 && (
        <section
          className="py-14"
          style={{
            background: "var(--color-paper)",
            borderTop: "1px solid var(--color-border)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
            <p
              className="mono uppercase mb-3"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              02 · Treatments
            </p>
            <h2 className="display" style={{ fontSize: 32, letterSpacing: "-0.02em" }}>
              Recommended <span className="italic-display">procedures.</span>
            </h2>

            <ul className="mt-7 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {treatments.map((ct: any) => (
                <li key={ct.treatment.id}>
                  <Link
                    href={`/treatment/${ct.treatment.slug}` as "/"}
                    className="paper flex h-full flex-col transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                    style={{ padding: 20 }}
                  >
                    <div className="flex items-start gap-2">
                      {ct.treatment.specialty?.name && (
                        <span
                          className="mono uppercase"
                          style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                        >
                          {ct.treatment.specialty.name}
                        </span>
                      )}
                      {ct.isPrimary && (
                        <span
                          className="ms-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: "var(--color-accent-soft)", color: "var(--color-accent-deep)" }}
                        >
                          Primary
                        </span>
                      )}
                    </div>
                    <h3
                      className="serif mt-2"
                      style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.015em", lineHeight: 1.2 }}
                    >
                      {ct.treatment.name}
                    </h3>
                    {ct.treatment.description && (
                      <p
                        className="mt-2 text-[13.5px] line-clamp-3"
                        style={{ color: "var(--color-ink-muted)", lineHeight: 1.5 }}
                      >
                        {ct.treatment.description}
                      </p>
                    )}
                    <div
                      className="mt-auto pt-4 inline-flex items-center justify-between"
                      style={{ borderTop: "1px solid var(--color-border-soft)" }}
                    >
                      <span
                        className="mono uppercase text-[10.5px]"
                        style={{ letterSpacing: "0.12em", color: "var(--color-accent)" }}
                      >
                        Compare prices
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 mirror-x" style={{ color: "var(--color-ink-subtle)" }} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Empty state — no mapped specialties or treatments */}
      {specialties.length === 0 && treatments.length === 0 && (
        <section className="py-14">
          <div className="mx-auto w-full max-w-[72rem] px-5 md:px-8">
            <div className="paper p-8 md:p-10" style={{ background: "var(--color-paper)" }}>
              <p
                className="mono uppercase mb-3"
                style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
              >
                Specialist review
              </p>
              <h2 className="display" style={{ fontSize: 28, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                Treatment options for {condition.name.toLowerCase()} depend on each patient&apos;s case.
              </h2>
              <p
                className="serif mt-4 max-w-[44rem]"
                style={{ fontSize: 17, lineHeight: 1.55, color: "var(--color-ink-muted)" }}
              >
                Share your reports and a board-certified specialist will come back within 48 hours with a written second opinion and a short-list of matched hospitals — free, no obligation.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild variant="accent" size="lg">
                  <Link href={`/second-opinion?condition=${conditionSlug}` as "/"}>
                    Free second opinion →
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/conditions">Browse other conditions</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="py-14">
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8 text-center">
          <p
            className="mono uppercase"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            Need help choosing?
          </p>
          <h2
            className="display mt-3"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.025em", lineHeight: 1.05 }}
          >
            Our coordinators help you{" "}
            <span className="italic-display">decide.</span>
          </h2>
          <p
            className="serif mt-4 max-w-[36rem] mx-auto"
            style={{ fontSize: 17, lineHeight: 1.5, color: "var(--color-ink-muted)" }}
          >
            Share your reports for a free 48-hour second opinion — and three
            hospital options matched to your case.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Button asChild variant="accent" size="lg">
              <Link href={`/contact?condition=${conditionSlug}` as "/"}>Get a free quote</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function firstWord(s: string) {
  const idx = s.indexOf(" ");
  return idx === -1 ? s : s.slice(0, idx);
}
function restOfName(s: string) {
  const idx = s.indexOf(" ");
  return idx === -1 ? "" : s.slice(idx + 1);
}
