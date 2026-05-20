"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/routing";
import { localeNames, type Locale } from "@/lib/i18n/config";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.replace(pathname, { locale: e.target.value as Locale });
  };

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Globe className="w-4 h-4 text-gray-500" />
      <select
        value={locale}
        onChange={handleChange}
        className="bg-transparent border-none text-gray-600 text-sm cursor-pointer focus:outline-none"
      >
        {Object.entries(localeNames).map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
