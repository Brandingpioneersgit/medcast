export const revalidate = 1800;

import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import { doctorQa, specialties } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { generateMeta } from "@/lib/utils/seo";
import { MessageSquareQuote, ChevronRight } from "lucide-react";

interface Props { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Ask a Doctor — Patient Q&A",
    description: "Real questions from patients, answered by board-certified specialists on MedCasts. Browse by specialty or ask your own.",
    path: "/qa",
    locale,
  });
}

export default async function QaIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  let rows: Array<{ id: number; slug: string; question: string; answeredAt: Date | null; specialtySlug: string | null; specialtyName: string | null }> = [];
  try {
    rows = await db
      .select({
        id: doctorQa.id,
        slug: doctorQa.slug,
        question: doctorQa.question,
        answeredAt: doctorQa.answeredAt,
        specialtySlug: specialties.slug,
        specialtyName: specialties.name,
      })
      .from(doctorQa)
      .leftJoin(specialties, eq(specialties.id, doctorQa.specialtyId))
      .where(eq(doctorQa.status, "answered"))
      .orderBy(desc(doctorQa.answeredAt))
      .limit(100);
  } catch (err) {
    console.warn("doctor_qa not yet migrated:", err);
  }

  return (
    <>
      <section className="py-14 md:py-16" style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          <p
            className="mono uppercase inline-flex items-center gap-2"
            style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            <MessageSquareQuote className="h-3.5 w-3.5" /> Patient Q&amp;A
          </p>
          <h1
            className="display display-tight mt-3"
            style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)", letterSpacing: "-0.03em", lineHeight: 1 }}
          >
            Real questions, <span className="italic-display">real doctors.</span>
          </h1>
          <p
            className="serif mt-4 max-w-2xl"
            style={{ fontSize: 19, lineHeight: 1.55, color: "var(--color-ink-muted)" }}
          >
            {rows.length} answered questions from patients, reviewed and moderated before publishing. Ask yours — typical turnaround is 48 hours.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/second-opinion"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-[14px] font-medium"
              style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
            >
              Ask a question →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
          {rows.length === 0 ? (
            <div className="paper text-center py-20" style={{ background: "var(--color-paper)" }}>
              <p style={{ color: "var(--color-ink-subtle)" }}>
                No published Q&amp;A yet. Migration may be pending — run <code className="font-mono">npm run db:migrate</code>.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {rows.map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/qa/${q.slug}` as "/"}
                    className="paper group p-5 flex items-start justify-between gap-3"
                    style={{ background: "var(--color-paper)" }}
                  >
                    <div className="min-w-0">
                      {q.specialtyName && q.specialtySlug && (
                        <div
                          className="mono uppercase"
                          style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-accent)" }}
                        >
                          {q.specialtyName}
                        </div>
                      )}
                      <div className="serif mt-1.5" style={{ fontSize: 16, lineHeight: 1.35, fontWeight: 500 }}>
                        {q.question}
                      </div>
                      {q.answeredAt && (
                        <div
                          className="mono tnum mt-2"
                          style={{ fontSize: 10.5, color: "var(--color-ink-subtle)" }}
                        >
                          {new Date(q.answeredAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <ChevronRight
                      className="h-4 w-4 mt-1 shrink-0 mirror-x transition-transform group-hover:translate-x-0.5"
                      style={{ color: "var(--color-ink-subtle)" }}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
