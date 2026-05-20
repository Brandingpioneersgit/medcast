import { setRequestLocale, getTranslations } from "next-intl/server";
import { generateMeta } from "@/lib/utils/seo";
import { QuoteWizard } from "@/components/shared/quote-wizard";
import { Container, Section } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Link } from "@/lib/i18n/routing";
import {
  Clock,
  Globe2,
  Languages,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const revalidate = 86400;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Request a free medical quote in under 11 minutes",
    description:
      "Share your case and we return three accredited hospital options, doctor matches, and transparent prices within 11 minutes. Free, multilingual, 24/7.",
    path: "/contact",
    locale,
  });
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("inquiry");
  const tc = await getTranslations("common");

  return (
    <>
      <div className="border-b border-border bg-bg">
        <Container>
          <div className="py-3.5">
            <Breadcrumb
              LinkComponent={({ href, ...p }) => <Link href={href as "/"} {...p} />}
              items={[{ label: tc("home"), href: "/" }, { label: tc("contactUs") }]}
            />
          </div>
        </Container>
      </div>

      <Section size="sm" className="pt-8 md:pt-14">
        <Container>
          <div className="max-w-3xl">
            <p
              className="mono uppercase mb-4 inline-flex items-center gap-2"
              style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
            >
              <Sparkles className="h-3 w-3" />
              Free quote · 3 hospitals in 48 hr
            </p>
            <h1
              className="display display-tight"
              style={{
                fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
                lineHeight: 1,
                fontWeight: 400,
                letterSpacing: "-0.03em",
              }}
            >
              Tell us your case,{" "}
              <span className="italic-display">we&apos;ll do the rest.</span>
            </h1>
            <p className="lede mt-5">
              Share your diagnosis and reports. Within 48 hours we return three accredited
              hospital options, matched doctors, and a transparent cost band — by WhatsApp,
              email or a scheduled call.
            </p>
          </div>
        </Container>
      </Section>

      <Section size="md" className="pt-0">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1.4fr,1fr]">
            <div>
              <QuoteWizard />
            </div>

            <aside className="flex flex-col gap-5">
              <Card variant="outline">
                <h2 className="font-display text-lg leading-tight mb-4">Reach us directly</h2>
                <ul className="space-y-4">
                  <li>
                    <a
                      href="https://wa.me/919643452714?text=Hi%2C%20I%27d%20like%20a%20free%20medical%20quote."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-3"
                    >
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                        <MessageCircle className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-ink group-hover:text-accent transition-colors">
                          WhatsApp
                        </span>
                        <span className="block text-xs text-ink-muted">
                          Instant · 24/7 · preferred
                        </span>
                      </span>
                    </a>
                  </li>
                  <li>
                    <a href="tel:+919643452714" className="group flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink-muted">
                        <Phone className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-ink group-hover:text-accent transition-colors">
                          +91 964 345 2714
                        </span>
                        <span className="block text-xs text-ink-muted">Mon–Sun, all hours</span>
                      </span>
                    </a>
                  </li>
                  <li>
                    <a href="mailto:info@medcasts.com" className="group flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink-muted">
                        <Mail className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-ink group-hover:text-accent transition-colors">
                          info@medcasts.com
                        </span>
                        <span className="block text-xs text-ink-muted">Reply in under 2 hours</span>
                      </span>
                    </a>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-subtle text-ink-muted">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-ink">New Delhi, India</span>
                      <span className="block text-xs text-ink-muted">Central ops desk</span>
                    </span>
                  </li>
                </ul>
              </Card>

              <Card variant="outline" className="bg-ink text-bg border-transparent">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-bg/70">
                  What happens next
                </p>
                <ol className="space-y-4">
                  <NextStep
                    n="01"
                    title="Call back in 11 minutes"
                    body="A named case manager reaches out on WhatsApp or phone."
                  />
                  <NextStep
                    n="02"
                    title="Three hand-matched hospitals"
                    body="Specialist, outcomes history and transparent price band."
                  />
                  <NextStep
                    n="03"
                    title="Full travel plan"
                    body="Visa letter, airport pickup, translator, and recovery stay."
                  />
                </ol>
              </Card>

              <Card variant="filled" className="border-transparent">
                <ul className="grid grid-cols-2 gap-4 text-xs text-ink-muted">
                  <Fact icon={<ShieldCheck className="h-3.5 w-3.5 text-accent" />} label="JCI / NABH" />
                  <Fact icon={<Languages className="h-3.5 w-3.5 text-accent" />} label="8 languages" />
                  <Fact icon={<Globe2 className="h-3.5 w-3.5 text-accent" />} label="60+ source countries" />
                  <Fact icon={<Clock className="h-3.5 w-3.5 text-accent" />} label="11-min response" />
                </ul>
              </Card>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}

function NextStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="flex items-start gap-4">
      <span className="font-display text-2xl leading-none text-bg/60">{n}</span>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-bg/70 leading-relaxed">{body}</span>
      </span>
    </li>
  );
}

function Fact({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="inline-flex items-center gap-2">
      {icon}
      <span>{label}</span>
    </li>
  );
}
