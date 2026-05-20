export const revalidate = 86400;

import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { generateMeta } from "@/lib/utils/seo";
import { GLOSSARY, groupGlossaryByCategory, CATEGORY_LABELS } from "@/lib/glossary";
import { BookOpen, ChevronRight } from "lucide-react";

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: `Medical Glossary — ${GLOSSARY.length} Terms Explained`,
    description: `Plain-English definitions of ${GLOSSARY.length} medical terms covering procedures, specialties, diagnoses, equipment, and international-patient logistics.`,
    path: "/glossary",
    locale,
  });
}

export default async function GlossaryIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const groups = groupGlossaryByCategory();
  const ordered: Array<[keyof typeof CATEGORY_LABELS, typeof GLOSSARY]> = [
    "procedure",
    "diagnosis",
    "specialty",
    "equipment",
    "concept",
    "anatomy",
  ]
    .filter((k) => groups.get(k as never) && (groups.get(k as never) as typeof GLOSSARY).length > 0)
    .map((k) => [k as never, groups.get(k as never) as typeof GLOSSARY]);

  return (
    <>
      <section
        className="py-14 md:py-16"
        style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <p
            className="mono uppercase inline-flex items-center gap-2"
            style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Glossary
          </p>
          <h1
            className="display display-tight mt-3"
            style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", letterSpacing: "-0.03em", lineHeight: 1 }}
          >
            Medical terms, <span className="italic-display">explained.</span>
          </h1>
          <p
            className="serif mt-4 max-w-2xl"
            style={{ fontSize: 19, lineHeight: 1.55, color: "var(--color-ink-muted)" }}
          >
            Plain-English definitions of the {GLOSSARY.length} terms that come up most often in cross-border treatment — procedures, specialties, diagnoses, equipment, and logistics.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <div className="space-y-14">
            {ordered.map(([cat, terms]) => (
              <div key={cat}>
                <h2 className="display mb-5" style={{ fontSize: 26, letterSpacing: "-0.02em" }}>
                  {CATEGORY_LABELS[cat]}{" "}
                  <span className="mono tnum" style={{ fontSize: 13, color: "var(--color-ink-subtle)", letterSpacing: 0 }}>
                    · {terms.length}
                  </span>
                </h2>
                <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {terms.map((t) => (
                    <li key={t.slug}>
                      <Link
                        href={`/glossary/${t.slug}` as "/"}
                        className="paper group p-4 flex items-start justify-between gap-3 h-full"
                        style={{ background: "var(--color-paper)" }}
                      >
                        <div className="min-w-0">
                          <div
                            className="serif font-medium"
                            style={{ fontSize: 16, letterSpacing: "-0.005em", lineHeight: 1.25 }}
                          >
                            {t.term}
                          </div>
                          <p
                            className="mt-1.5 line-clamp-2"
                            style={{ fontSize: 13, lineHeight: 1.45, color: "var(--color-ink-muted)" }}
                          >
                            {t.shortDef}
                          </p>
                        </div>
                        <ChevronRight
                          className="h-4 w-4 mt-1 shrink-0 mirror-x transition-transform group-hover:translate-x-0.5"
                          style={{ color: "var(--color-ink-subtle)" }}
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
