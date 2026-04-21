import type { APIRoute } from "astro";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
    if (lines.length >= 3) break;
  }
  if (cur && lines.length < 4) lines.push(cur);
  return lines.slice(0, 4);
}

export const GET: APIRoute = ({ url }) => {
  const title = (url.searchParams.get("title") ?? "MedCasts").slice(0, 140);
  const lines = wrap(title, 28);
  const startY = 260 - (lines.length - 1) * 36;

  const tspans = lines
    .map((l, i) => `<tspan x="80" y="${startY + i * 92}">${escape(l)}</tspan>`)
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F5F1EA"/>
      <stop offset="1" stop-color="#E8DFD1"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="8" fill="#1F5A47"/>
  <text x="80" y="110" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="600" fill="#1F5A47" letter-spacing="3">MEDCASTS</text>
  <text font-family="Fraunces, Georgia, serif" font-size="80" font-weight="500" fill="#1A1815" letter-spacing="-1.5">${tspans}</text>
  <text x="80" y="560" font-family="Inter, system-ui, sans-serif" font-size="22" fill="#54504A">medical care, borderless — 9 destinations, 9,254 hospitals</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, immutable",
    },
  });
};
