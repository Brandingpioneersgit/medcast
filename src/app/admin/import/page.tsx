import { requireAuth } from "@/lib/auth";
import { BulkImportClient } from "@/components/admin/bulk-import";

export default async function ImportPage() {
  await requireAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Bulk Import</h1>
      <p className="text-gray-500 mb-6">Upload CSV files to import hospitals, doctors, or treatments in bulk.</p>
      <BulkImportClient />
    </div>
  );
}
