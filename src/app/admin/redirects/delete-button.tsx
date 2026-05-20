"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteButton({ id }: { id: number }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function remove() {
    if (submitting) return;
    if (!confirm("Delete this redirect? Old URLs will start 404ing again.")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/redirects?id=${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={submitting}
      className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
      aria-label="Delete redirect"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
