import { Link } from "@/lib/i18n/routing";
import { Bed, MapPin, ShieldCheck } from "lucide-react";
import { RatingStars } from "@/components/ui/rating";
import { AccreditationBadge } from "@/components/ui/accreditation-badge";
import { hospitalImage } from "@/lib/images/stock";
import type { HospitalListRow } from "@/lib/db/queries-hospitals-list";

export function HospitalCard({ h }: { h: HospitalListRow }) {
  const src = hospitalImage({ slug: h.slug, coverImageUrl: h.coverImageUrl }, 900, 563);
  return (
    <Link
      href={`/hospital/${h.slug}` as "/"}
      className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-subtle">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={h.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
        {h.rating && Number(h.rating) > 0 && (
          <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-surface/95 px-2 py-1 text-[11px] font-semibold text-ink backdrop-blur">
            <RatingStars value={h.rating} size="xs" />
            <span>{Number(h.rating).toFixed(1)}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs uppercase tracking-wider text-ink-subtle inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" /> {h.cityName}, {h.countryName}
        </p>
        <h3 className="mt-1 font-display text-lg leading-snug text-ink line-clamp-2 group-hover:text-accent transition-colors">
          {h.name}
        </h3>
        {h.description && (
          <p className="mt-2 text-sm text-ink-muted line-clamp-2">{h.description}</p>
        )}
        <div className="mt-4 flex flex-1 flex-col justify-end gap-3">
          <div className="flex items-center gap-4 text-xs text-ink-muted">
            {h.bedCapacity ? (
              <span className="inline-flex items-center gap-1">
                <Bed className="h-3.5 w-3.5" /> {h.bedCapacity.toLocaleString()} beds
              </span>
            ) : null}
            {h.reviewCount && h.reviewCount > 0 ? (
              <span>{h.reviewCount.toLocaleString()} reviews</span>
            ) : null}
          </div>
          {h.accreditations.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {h.accreditations.slice(0, 3).map((a, i) => (
                <AccreditationBadge
                  key={`${a.acronym ?? a.name}-${i}`}
                  name={a.name}
                  abbreviation={a.acronym ?? undefined}
                />
              ))}
              {h.accreditations.length > 3 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2 py-0.5 text-[11px] text-ink-muted">
                  <ShieldCheck className="h-3 w-3" />
                  +{h.accreditations.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
