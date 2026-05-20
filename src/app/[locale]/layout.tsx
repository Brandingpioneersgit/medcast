import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Inter, Fraunces } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/lib/i18n/routing";
import { isRtl, type Locale } from "@/lib/i18n/config";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { AnalyticsScripts } from "@/components/shared/analytics-scripts";
import { ChatWidget } from "@/components/shared/chat-widget";
import { ConsentBanner } from "@/components/shared/consent-banner";
import { ThemeScript } from "@/components/shared/theme-script";
import { ServiceWorkerRegister } from "@/components/shared/sw-register";
import { Toaster } from "@/components/ui/toast";
import "@/app/globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: {
    default: "MedCasts — Medical Assistance, Worldwide",
    template: "%s | MedCasts",
  },
  description:
    "MedCasts connects patients with 60+ JCI-accredited hospitals across India, Turkey, Singapore, UAE and more. Transparent pricing, 8 languages, 24/7 assistance.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://medcasts.com"),
  applicationName: "MedCasts",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "MedCasts", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: true, email: true, address: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0d9488" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = isRtl(locale as Locale) ? "rtl" : "ltr";

  return (
    <div
      lang={locale}
      dir={dir}
      className={`${inter.variable} ${fraunces.variable} min-h-full flex flex-col bg-bg text-ink`}
    >
      <ThemeScript />
      <NextIntlClientProvider messages={messages}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:bg-white focus:text-teal-700 focus:px-3 focus:py-2 focus:rounded-lg focus:shadow-md">
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1 pb-20 lg:pb-0">{children}</main>
        <Footer />
        <MobileTabBar />
        <WhatsAppButton />
        <ChatWidget locale={locale} />
        <ConsentBanner />
        <Toaster />
        <AnalyticsScripts locale={locale} />
        <ServiceWorkerRegister />
      </NextIntlClientProvider>
    </div>
  );
}
