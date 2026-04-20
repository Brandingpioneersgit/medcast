export const revalidate = 86400;

import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { generateMeta } from "@/lib/utils/seo";
import { GLOSSARY, findGlossaryTerm, CATEGORY_LABELS } from "@/lib/glossary";
import { Button } from "@/components/ui/button";
import { ChevronRight, BookOpen } from "lucide-react";

interface Props { params: Promise<{ locale: string; term: string }> }

export async function generateStaticParams() {
  return GLOSSARY.map((t) => ({ term: t.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { locale, term } = await params;
  const t = findGlossaryTerm(term);
  if (!t) return {};
  return generateMeta({
    title: `${t.term} — Definition, Related Procedures & Hospitals`,
    description: t.shortDef,
    path: `/glossary/${t.slug}`,
    locale,
  });
}

function definedTermJsonLd(term: { term: string; shortDef: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: term.term,
    description: term.shortDef,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "MedCasts Medical Glossary",
    },
  };
}

export default async function GlossaryTermPage({ params }: Props) {
  const { locale, term } = await params;
  setRequestLocale(locale);

  const t = findGlossaryTerm(term);
  if (!t) notFound();

  const tc = await getTranslations("common");

  const related = GLOSSARY.filter(
    (x) =>
      x.slug !== t.slug &&
      (x.category === t.category ||
        (t.relatedSpecialty && x.relatedSpecialty === t.relatedSpecialty))
  ).slice(0, 6);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermJsonLd(t)) }}
      />

      <div style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border-soft)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-4">
          <nav className="mono text-[12px]" style={{ color: "var(--color-ink-subtle)" }} aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink">{tc("home")}</Link>
            <span className="mx-1.5">/</span>
            <Link href="/glossary" className="hover:text-ink">Glossary</Link>
            <span className="mx-1.5">/</span>
            <span style={{ color: "var(--color-ink)" }}>{t.term}</span>
          </nav>
        </div>
      </div>

      <section
        className="py-12 md:py-16"
        style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="mx-auto w-full max-w-[72rem] px-5 md:px-8">
          <p
            className="mono uppercase inline-flex items-center gap-2"
            style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            <BookOpen className="h-3.5 w-3.5" />
            {CATEGORY_LABELS[t.category]}
          </p>
          <h1
            className="display display-tight mt-3"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)", letterSpacing: "-0.025em", lineHeight: 1.02 }}
          >
            {t.term}
          </h1>
          {t.synonyms && t.synonyms.length > 0 && (
            <p
              className="mt-3"
              style={{ fontSize: 14, color: "var(--color-ink-subtle)" }}
            >
              Also known as: {t.synonyms.join(", ")}
            </p>
          )}
          <p
            className="serif mt-5"
            style={{ fontSize: 21, lineHeight: 1.5, color: "var(--color-ink)" }}
          >
            {t.shortDef}
          </p>
          {t.longDef && (
            <p
              className="serif mt-4 max-w-[48rem]"
              style={{ fontSize: 17, lineHeight: 1.6, color: "var(--color-ink-muted)" }}
            >
              {t.longDef}
            </p>
          )}
        </div>
      </section>

      {(t.relatedSpecialty || t.relatedTreatment || t.relatedCondition) && (
        <section className="py-12">
          <div className="mx-auto w-full max-w-[72rem] px-5 md:px-8">
            <p
              className="mono uppercase mb-4"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              Get help with this
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {t.relatedSpecialty && (
                <Link
                  href={`/specialty/${t.relatedSpecialty}` as "/"}
                  className="paper group p-5 flex items-start justify-between gap-3"
                  style={{ background: "var(--color-paper)" }}
                >
                  <div>
                    <div
                      className="mono uppercase"
                      style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                    >
                      Specialty
                    </div>
                    <div className="serif mt-1" style={{ fontSize: 17, fontWeight: 500 }}>
                      View specialists →
                    </div>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 mt-1 mirror-x transition-transform group-hover:translate-x-0.5"
                    style={{ color: "var(--color-ink-subtle)" }}
                  />
                </Link>
              )}
              {t.relatedTreatment && (
                <Link
                  href={`/treatment/${t.relatedTreatment}` as "/"}
                  className="paper group p-5 flex items-start justify-between gap-3"
                  style={{ background: "var(--color-paper)" }}
                >
                  <div>
                    <div
                      className="mono uppercase"
                      style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                    >
                      Treatment
                    </div>
                    <div className="serif mt-1" style={{ fontSize: 17, fontWeight: 500 }}>
                      Compare prices →
                    </div>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 mt-1 mirror-x transition-transform group-hover:translate-x-0.5"
                    style={{ color: "var(--color-ink-subtle)" }}
                  />
                </Link>
              )}
              {t.relatedCondition && (
                <Link
                  href={`/condition/${t.relatedCondition}` as "/"}
                  className="paper group p-5 flex items-start justify-between gap-3"
                  style={{ background: "var(--color-paper)" }}
                >
                  <div>
                    <div
                      className="mono uppercase"
                      style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                    >
                      Condition
                    </div>
                    <div className="serif mt-1" style={{ fontSize: 17, fontWeight: 500 }}>
                      Treatment options →
                    </div>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 mt-1 mirror-x transition-transform group-hover:translate-x-0.5"
                    style={{ color: "var(--color-ink-subtle)" }}
                  />
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section
          className="py-12"
          style={{ background: "var(--color-paper)", borderTop: "1px solid var(--color-border)" }}
        >
          <div className="mx-auto w-full max-w-[72rem] px-5 md:px-8">
            <p
              className="mono uppercase mb-4"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              Related terms
            </p>
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/glossary/${r.slug}` as "/"}
                    className="paper group p-4 block h-full"
                    style={{ background: "var(--color-bg)" }}
                  >
                    <div className="serif font-medium" style={{ fontSize: 15.5, lineHeight: 1.25 }}>
                      {r.term}
                    </div>
                    <p
                      className="mt-1.5 line-clamp-2"
                      style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--color-ink-muted)" }}
                    >
                      {r.shortDef}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="py-14">
        <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8 text-center">
          <h2
            className="display"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.25rem)", letterSpacing: "-0.025em", lineHeight: 1.15 }}
          >
            Need a <span className="italic-display">second opinion</span> on this?
          </h2>
          <p className="serif mt-3 max-w-[36rem] mx-auto" style={{ fontSize: 16, lineHeight: 1.55, color: "var(--color-ink-muted)" }}>
            Share your reports — a board-certified specialist will come back within 48 hours with a written second opinion.
          </p>
          <Button asChild variant="accent" size="lg" className="mt-6">
            <Link href="/second-opinion">Get a free second opinion</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
