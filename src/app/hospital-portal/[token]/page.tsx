import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { hospitals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyToken } from "@/lib/tokens";
import { HospitalPortalForm } from "@/components/shared/hospital-portal-form";
import type { Metadata } from "next";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Edit Listing — MedCasts Hospital Portal",
};

export default async function HospitalPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const claims = verifyToken<{ hospitalId: number; kind: string }>(token);
  if (!claims || claims.kind !== "hospital-portal") notFound();

  const h = await db.query.hospitals.findFirst({ where: eq(hospitals.id, claims.hospitalId) });
  if (!h) notFound();

  return (
    <main className="min-h-[70vh] py-14 md:py-18" style={{ background: "var(--color-bg)" }}>
      <div className="max-w-3xl mx-auto px-5 md:px-8">
        <div className="mb-8">
          <p
            className="mono uppercase mb-3"
            style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
          >
            Hospital Portal
          </p>
          <h1
            className="display display-tight"
            style={{
              fontSize: "clamp(1.75rem, 4vw, 3rem)",
              lineHeight: 1.05,
              fontWeight: 400,
              letterSpacing: "-0.03em",
            }}
          >
            {h.name}
          </h1>
          <p
            className="serif mt-4"
            style={{ fontSize: 16, lineHeight: 1.5, color: "var(--color-ink-muted)" }}
          >
            You&apos;re signed in via a one-time invite link. Changes save instantly.
          </p>
        </div>

        <HospitalPortalForm
          token={token}
          initial={{
            name: h.name,
            description: h.description ?? "",
            phone: h.phone ?? "",
            email: h.email ?? "",
            website: h.website ?? "",
            bedCapacity: h.bedCapacity ?? null,
            establishedYear: h.establishedYear ?? null,
            airportDistanceKm: h.airportDistanceKm?.toString() ?? "",
            coverImageUrl: h.coverImageUrl ?? "",
          }}
        />
      </div>
    </main>
  );
}
