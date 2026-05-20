import { Link } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <section className="map-bg" style={{ minHeight: "calc(100vh - 200px)" }}>
      <div className="mx-auto w-full max-w-[60rem] px-5 md:px-8 py-20 md:py-28 text-center">
        <p
          className="mono uppercase tnum"
          style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
        >
          404 · Page not found
        </p>
        <h1
          className="display display-tight mt-4"
          style={{
            fontSize: "clamp(2.75rem, 6vw, 5.5rem)",
            lineHeight: 0.96,
            fontWeight: 400,
            letterSpacing: "-0.035em",
          }}
        >
          We can&apos;t find{" "}
          <span className="italic-display">that page.</span>
        </h1>
        <p
          className="serif mt-5 max-w-[36rem] mx-auto"
          style={{ fontSize: 19, lineHeight: 1.5, color: "var(--color-ink-muted)" }}
        >
          The link may be outdated, or the page has moved. Try one of the
          paths below — or get in touch with a coordinator.
        </p>

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button asChild variant="accent" size="lg">
            <Link href="/">
              Back to home
              <ArrowRight className="h-4 w-4 mirror-x" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/contact">Talk to a coordinator</Link>
          </Button>
        </div>

        <ul className="mt-12 flex flex-wrap justify-center gap-2">
          {[
            { href: "/hospitals", label: "Hospitals" },
            { href: "/doctors", label: "Doctors" },
            { href: "/treatments", label: "Treatments" },
            { href: "/specialties", label: "Specialties" },
            { href: "/second-opinion", label: "Free second opinion" },
            { href: "/sitemap-browse", label: "Sitemap" },
          ].map((l) => (
            <li key={l.href}>
              <Link
                href={l.href as "/"}
                className="inline-flex items-center px-3 py-1.5 rounded-full text-[12.5px]"
                style={{
                  border: "1px solid var(--color-border)",
                  color: "var(--color-ink-muted)",
                }}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
