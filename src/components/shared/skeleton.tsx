import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-gray-200 rounded-lg", className)} />
  );
}

export function HospitalCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <Skeleton className="h-48 rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

export function DoctorCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 text-center">
      <Skeleton className="w-20 h-20 rounded-full mx-auto mb-4" />
      <Skeleton className="h-5 w-32 mx-auto mb-2" />
      <Skeleton className="h-4 w-24 mx-auto mb-1" />
      <Skeleton className="h-3 w-28 mx-auto mb-3" />
      <div className="flex justify-center gap-2 mb-4">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  );
}

export function TreatmentCardSkeleton() {
  return (
    <div className="bg-white/70 rounded-3xl p-6 border border-emerald-200">
      <Skeleton className="w-12 h-12 rounded-xl mb-4" />
      <Skeleton className="h-5 w-3/4 mb-3" />
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
      <Skeleton className="h-4 w-24 mb-1" />
      <Skeleton className="h-6 w-32 mb-4" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}
