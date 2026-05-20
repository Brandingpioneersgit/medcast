export const revalidate = 3600;

import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import { doctorQa, doctors, specialties, hospitals } from "@/lib/db/schema";
import { and, desc, eq, ne } from "drizzle-orm";
import { generateMeta } from "@/lib/utils/seo";
import { formatDoctorName } from "@/lib/utils/doctor-name";
import { Button } from "@/components/ui/button";
import { MessageSquareQuote, Stethoscope, ChevronRight } from "lucide-react";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

async function loadQa(slug: string) {
  try {
    const row = await db.query.doctorQa.findFirst({
      where: and(eq(doctorQa.slug, slug), eq(doctorQa.status, "answered")),
    });
    if (!row) return null;
    const [doctor, specialty] = await Promise.all([
      row.doctorId
        ? db
            .select({
              id: doctors.id,
              name: doctors.name,
              slug: doctors.slug,
              title: doctors.title,
              imageUrl: doctors.imageUrl,
              qualifications: doctors.qualifications,
              hospitalName: hospitals.name,
              hospitalSlug: hospitals.slug,
            })
            .from(doctors)
            .leftJoin(hospitals, eq(hospitals.id, doctors.hospitalId))
            .where(eq(doctors.id, row.doctorId))
            .limit(1)
            .then((r) => r[0] ?? null)
        : Promise.resolve(null),
      row.specialtyId
        ? db.query.specialties.findFirst({ where: eq(specialties.id, row.specialtyId) })
        : Promise.resolve(null),
    ]);
    return { qa: row, doctor, specialty };
  } catch {
    return null;
  }
}

function qaJsonLd(qa: {
  question: string;
  answer: string;
  createdAt: Date;
  answeredAt: Date | null;
  answeredBy?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: qa.question,
      text: qa.question,
      dateCreated: qa.createdAt.toISOString(),
      answerCount: 1,
      acceptedAnswer: {
        "@type": "Answer",
        text: qa.answer,
        dateCreated: (qa.answeredAt ?? qa.createdAt).toISOString(),
        author: { "@type": "Person", name: qa.answeredBy ?? "MedCasts medical panel" },
      },
    },
  };
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const data = await loadQa(slug);
  if (!data) return {};
  return generateMeta({
    title: data.qa.metaTitle ?? data.qa.question.slice(0, 120),
    description:
      data.qa.metaDescription ??
      (data.qa.answer ?? "").slice(0, 260) ??
      data.qa.question.slice(0, 260),
    path: `/qa/${data.qa.slug}`,
    locale,
  });
}

export default async function QaDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const data = await loadQa(slug);
  if (!data) notFound();
  const tc = await getTranslations("common");

  const related = data.qa.specialtyId
    ? await db.query.doctorQa
        .findMany({
          where: and(
            eq(doctorQa.status, "answered"),
            eq(doctorQa.specialtyId, data.qa.specialtyId),
            ne(doctorQa.id, data.qa.id)
          ),
          orderBy: [desc(doctorQa.answeredAt)],
          limit: 4,
        })
        .catch(() => [])
    : [];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            qaJsonLd({
              question: data.qa.question,
              answer: data.qa.answer ?? "",
              createdAt: data.qa.createdAt,
              answeredAt: data.qa.answeredAt,
              answeredBy: data.qa.answeredBy,
            })
          ),
        }}
      />

      <div style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border-soft)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-4">
          <nav className="mono text-[12px]" style={{ color: "var(--color-ink-subtle)" }}>
            <Link href="/" className="hover:text-ink">{tc("home")}</Link>
            <span className="mx-1.5">/</span>
            <Link href="/qa" className="hover:text-ink">Q&amp;A</Link>
            {data.specialty && (
              <>
                <span className="mx-1.5">/</span>
                <Link href={`/specialty/${data.specialty.slug}` as "/"} className="hover:text-ink">
                  {data.specialty.name}
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>

      <section className="py-12 md:py-16" style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[72rem] px-5 md:px-8">
          <p
            className="mono uppercase inline-flex items-center gap-2"
            style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            <MessageSquareQuote className="h-3.5 w-3.5" /> Doctor Q&amp;A
          </p>
          <h1
            className="display display-tight mt-3"
            style={{ fontSize: "clamp(1.75rem, 4vw, 3rem)", letterSpacing: "-0.02em", lineHeight: 1.1 }}
          >
            {data.qa.question}
          </h1>
          <p
            className="mono uppercase mt-4"
            style={{ fontSize: 10.5, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
          >
            Answered {new Date(data.qa.answeredAt ?? data.qa.createdAt).toLocaleDateString()}
            {data.qa.answeredBy ? ` · ${data.qa.answeredBy}` : ""}
          </p>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto w-full max-w-[72rem] px-5 md:px-8 grid gap-10 lg:grid-cols-[2fr,1fr]">
          <article>
            <p
              className="serif"
              style={{ fontSize: 19, lineHeight: 1.7, color: "var(--color-ink)", whiteSpace: "pre-wrap" }}
            >
              {data.qa.answer}
            </p>
          </article>
          <aside className="space-y-4">
            {data.doctor && (
              <div className="paper p-5" style={{ background: "var(--color-paper)" }}>
                <div
                  className="mono uppercase"
                  style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
                >
                  Answered by
                </div>
                <div className="mt-2 flex items-center gap-3">
                  {data.doctor.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={data.doctor.imageUrl}
                      alt={data.doctor.name}
                      className="rounded-full shrink-0"
                      style={{ width: 52, height: 52, objectFit: "cover" }}
                      loading="lazy"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="serif font-medium" style={{ fontSize: 15.5 }}>
                      {formatDoctorName(data.doctor.name, data.doctor.title)}
                    </div>
                    {data.doctor.hospitalName && (
                      <div className="text-[12px] truncate" style={{ color: "var(--color-ink-subtle)" }}>
                        {data.doctor.hospitalName}
                      </div>
                    )}
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                  <Link href={`/doctor/${data.doctor.slug}` as "/"}>View profile →</Link>
                </Button>
              </div>
            )}

            {data.specialty && (
              <div className="paper p-5" style={{ background: "var(--color-accent-mist)", border: "1px solid var(--color-accent-soft)" }}>
                <div className="flex items-start gap-3">
                  <Stethoscope className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "var(--color-accent-deep)" }} />
                  <div>
                    <div className="mono uppercase" style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--color-accent)" }}>
                      Find a specialist
                    </div>
                    <div className="serif mt-1" style={{ fontSize: 15.5, fontWeight: 500 }}>
                      {data.specialty.name} hospitals
                    </div>
                    <Link
                      href={`/specialty/${data.specialty.slug}` as "/"}
                      className="mt-2 inline-flex items-center gap-1 text-[13.5px] font-medium"
                      style={{ color: "var(--color-accent)" }}
                    >
                      Browse hospitals →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>

      {related.length > 0 && (
        <section className="py-12" style={{ background: "var(--color-paper)", borderTop: "1px solid var(--color-border)" }}>
          <div className="mx-auto w-full max-w-[72rem] px-5 md:px-8">
            <p
              className="mono uppercase mb-4"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              Related questions
            </p>
            <ul className="grid gap-3 md:grid-cols-2">
              {related.map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/qa/${q.slug}` as "/"}
                    className="paper group p-4 flex items-start justify-between gap-3"
                    style={{ background: "var(--color-bg)" }}
                  >
                    <div
                      className="serif font-medium"
                      style={{ fontSize: 15, letterSpacing: "-0.005em", lineHeight: 1.3 }}
                    >
                      {q.question}
                    </div>
                    <ChevronRight
                      className="h-4 w-4 mt-1 mirror-x shrink-0 transition-transform group-hover:translate-x-0.5"
                      style={{ color: "var(--color-ink-subtle)" }}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
