import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import Link from "next/link";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string } | { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-gray-200 mb-4">
        <Icon className="w-7 h-7 text-gray-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mt-1.5 max-w-sm">{description}</p>
      )}
      {action && (
        <div className="mt-5">
          {"href" in action ? (
            <Link
              href={action.href}
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors"
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
