import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { treatments, specialties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AdminPageHeader, NotesPanel, ArchiveButton } from "@/components/admin";
import { TreatmentForm } from "@/components/admin/treatment-form";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function EditTreatmentPage({ params }: Props) {
  await requireAuth();
  const { id } = await params;
  const treatment = await db.query.treatments.findFirst({
    where: eq(treatments.id, Number(id)),
  });
  if (!treatment) notFound();

  const specialtyList = await db
    .select({ id: specialties.id, name: specialties.name })
    .from(specialties);

  return (
    <div>
      <AdminPageHeader
        title={treatment.name}
        subtitle={`/treatment/${treatment.slug}`}
        breadcrumbs={[
          { label: "Treatments", href: "/admin/treatments" },
          { label: "Edit" },
        ]}
        actions={
          <>
            <Link
              href={`/treatment/${treatment.slug}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View on site
            </Link>
            <ArchiveButton
              entityType="treatment"
              entityId={treatment.id}
              slug={treatment.slug}
              isArchived={!!treatment.archivedAt}
            />
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr,360px] items-start">
        <TreatmentForm treatment={treatment} specialties={specialtyList} />
        <aside className="lg:sticky lg:top-6">
          <NotesPanel entityType="treatment" entityId={treatment.id} />
        </aside>
      </div>
    </div>
  );
}
