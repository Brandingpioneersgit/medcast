"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type EntityType = "hospitals" | "doctors" | "treatments";

const TEMPLATES: Record<EntityType, string> = {
  hospitals: "name,slug,city,country,description,phone,email,website,established_year,bed_capacity,rating",
  doctors: "name,slug,hospital_slug,title,qualifications,experience_years,patients_treated,rating,bio,specialty_slug",
  treatments: "name,slug,specialty_slug,description,hospital_stay_days,recovery_days,success_rate_percent",
};

export function BulkImportClient() {
  const [entityType, setEntityType] = useState<EntityType>("hospitals");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<{ imported: number; errors: string[] }>({ imported: 0, errors: [] });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      const parsed = lines.slice(0, 6).map(l =>
        l.split(",").map(cell => cell.trim().replace(/^"|"$/g, ""))
      );
      setPreview(parsed);
    };
    reader.readAsText(f);
  }

  async function handleImport() {
    if (!file) return;
    setStatus("loading");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("entityType", entityType);

    try {
      const res = await fetch("/api/admin/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult({ imported: data.imported, errors: data.errors || [] });
      setStatus("success");
    } catch (err) {
      setResult({ imported: 0, errors: [err instanceof Error ? err.message : "Import failed"] });
      setStatus("error");
    }
  }

  function downloadTemplate() {
    const csv = TEMPLATES[entityType] + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entityType}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Entity type */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">1. Select Entity Type</h2>
        <div className="flex gap-3">
          {(["hospitals", "doctors", "treatments"] as EntityType[]).map(type => (
            <button
              key={type}
              onClick={() => { setEntityType(type); setPreview([]); setFile(null); setStatus("idle"); }}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium border capitalize transition-colors ${
                entityType === type ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <button onClick={downloadTemplate} className="mt-3 text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1">
          <FileText className="w-4 h-4" /> Download CSV template
        </button>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">2. Upload CSV File</h2>
        <label className="flex flex-col items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-teal-300 transition-colors">
          <Upload className="w-8 h-8 text-gray-400" />
          <p className="text-sm text-gray-500">{file ? file.name : "Click to upload CSV file"}</p>
          <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
        </label>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">3. Preview (first 5 rows)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  {preview[0]?.map((header, i) => (
                    <th key={i} className="px-3 py-2 text-left font-medium text-gray-500">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.slice(1, 6).map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2 text-gray-600 max-w-xs truncate">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={status === "loading"}
            className="mt-4 bg-teal-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
          >
            {status === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
            Import {entityType}
          </button>
        </div>
      )}

      {/* Result */}
      {status === "success" && (
        <div className="bg-green-50 rounded-xl p-6 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-800">Import complete!</p>
            <p className="text-sm text-green-700">{result.imported} {entityType} imported successfully.</p>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-red-600 font-medium">{result.errors.length} errors:</p>
                {result.errors.slice(0, 5).map((err, i) => (
                  <p key={i} className="text-xs text-red-500">{err}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {status === "error" && (
        <div className="bg-red-50 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Import failed</p>
            {result.errors.map((err, i) => (
              <p key={i} className="text-sm text-red-600">{err}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
