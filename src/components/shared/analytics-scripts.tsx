"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";
const CRISP_WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

declare global {
  interface Window {
    posthog?: { capture: (event: string, props?: Record<string, unknown>) => void; $set?: unknown };
    $crisp?: unknown[];
    CRISP_WEBSITE_ID?: string;
    gtag?: (...args: unknown[]) => void;
    plausible?: (event: string, opts?: { props?: Record<string, unknown> }) => void;
  }
}

function readConsent(): "all" | "necessary" | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie.split("; ").find((c) => c.startsWith("mc-consent="));
  if (!raw) return null;
  const v = raw.split("=")[1];
  return v === "all" || v === "necessary" ? v : null;
}

export function AnalyticsScripts({ locale }: { locale?: string }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<"all" | "necessary" | null>(null);

  useEffect(() => {
    setConsent(readConsent());
    const onConsent = (e: Event) => setConsent((e as CustomEvent<"all" | "necessary">).detail ?? "all");
    window.addEventListener("mc:consent", onConsent);
    return () => window.removeEventListener("mc:consent", onConsent);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (consent !== "all") return;
    window.posthog?.capture("$pageview", { locale, pathname });
    window.plausible?.("pageview");
  }, [pathname, locale, consent]);

  if (consent !== "all") return null;

  return (
    <>
      {POSTHOG_KEY && (
        <Script id="posthog" strategy="afterInteractive">
          {`!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init("${POSTHOG_KEY}",{api_host:"${POSTHOG_HOST}"})`}
        </Script>
      )}
      {GA_MEASUREMENT_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${GA_MEASUREMENT_ID}');`}
          </Script>
        </>
      )}
      {PLAUSIBLE_DOMAIN && (
        <Script defer data-domain={PLAUSIBLE_DOMAIN} src="https://plausible.io/js/script.js" strategy="afterInteractive" />
      )}
      {CRISP_WEBSITE_ID && (
        <Script id="crisp" strategy="afterInteractive">
          {`window.$crisp=[];window.CRISP_WEBSITE_ID="${CRISP_WEBSITE_ID}";(function(){var d=document;var s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();`}
        </Script>
      )}
    </>
  );
}
