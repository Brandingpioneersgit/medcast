import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hospitals, cities, countries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AdminPageHeader, NotesPanel, ArchiveButton } from "@/components/admin";
import { HospitalForm } from "@/components/admin/hospital-form";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function EditHospitalPage({ params }: Props) {
  await requireAuth();
  const { id } = await params;

  const hospital = await db.query.hospitals.findFirst({
    where: eq(hospitals.id, Number(id)),
  });
  if (!hospital) notFound();

  const cityList = await db
    .select({ id: cities.id, name: cities.name, countryName: countries.name })
    .from(cities)
    .innerJoin(countries, eq(cities.countryId, countries.id));

  return (
    <div>
      <AdminPageHeader
        title={hospital.name}
        subtitle={`/hospital/${hospital.slug}`}
        breadcrumbs={[
          { label: "Hospitals", href: "/admin/hospitals" },
          { label: "Edit" },
        ]}
        actions={
          <>
            <Link
              href={`/hospital/${hospital.slug}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View on site
            </Link>
            <ArchiveButton
              entityType="hospital"
              entityId={hospital.id}
              slug={hospital.slug}
              isArchived={!!hospital.archivedAt}
            />
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr,360px] items-start">
        <HospitalForm hospital={hospital} cities={cityList} />
        <aside className="lg:sticky lg:top-6 space-y-5">
          <NotesPanel entityType="hospital" entityId={hospital.id} />
        </aside>
      </div>
    </div>
  );
}
