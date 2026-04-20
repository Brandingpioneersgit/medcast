import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const localeNames: Record<string, string> = {
  en: "English", ar: "العربية", ru: "Русский", fr: "Français",
  pt: "Português", bn: "বাংলা", tr: "Türkçe", hi: "हिन्दी",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "MedCasts").slice(0, 120);
  const subtitle = searchParams.get("subtitle")?.slice(0, 180) || "Trusted Medical Tourism Partner";
  const locale = searchParams.get("locale") || "en";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0d9488 0%, #059669 100%)",
          color: "white",
          padding: "80px",
          justifyContent: "space-between",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: 32, fontWeight: 700 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "white", color: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>M</div>
            MedCasts
          </div>
          <div style={{ fontSize: 20, opacity: 0.8 }}>{localeNames[locale] || "English"}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1, marginBottom: 24 }}>
            {title}
          </div>
          <div style={{ fontSize: 28, opacity: 0.9, lineHeight: 1.3 }}>{subtitle}</div>
        </div>

        <div style={{ display: "flex", gap: 24, fontSize: 18, opacity: 0.8 }}>
          <div>🌏 8 Languages</div>
          <div>🏥 Top Hospitals</div>
          <div>💰 Save up to 70%</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
