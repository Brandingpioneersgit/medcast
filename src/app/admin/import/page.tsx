import { requireAuth } from "@/lib/auth";
import { AdminPageHeader } from "@/components/admin";
import { BulkImportClient } from "@/components/admin/bulk-import";

export default async function ImportPage() {
  await requireAuth();

  return (
    <div>
      <AdminPageHeader
        title="Bulk import"
        subtitle="Upload a CSV to add or update hospitals, doctors, or treatments. Every row is validated locally before anything reaches the database — fix or skip invalid rows in the dry-run preview."
      />
      <BulkImportClient />
    </div>
  );
}
