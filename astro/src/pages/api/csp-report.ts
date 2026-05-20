/**
 * CSP violation receiver. Browsers POST a JSON report here when a page
 * trips a Content-Security-Policy rule. We log to Sentry (if configured)
 * and return 204 No Content. Quiet by design — a noisy receiver is a DDoS
 * vector.
 *
 * Wire from middleware via `report-uri /api/csp-report` (Reporting-API
 * `report-to` group also points here once we set the Report-To header).
 *
 * The browser sends one of two payload shapes depending on the directive:
 *   - Legacy `report-uri`: { "csp-report": { "document-uri", "violated-directive", ... } }
 *   - Modern Reporting API: [{ "type": "csp-violation", "body": { ... } }]
 *
 * We accept both, drop self-noise (chrome-extension://, moz-extension://),
 * and rate-limit on IP since browsers can fire many reports per page.
 */
import type { APIRoute } from "astro";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { sql as raw } from "@/lib/db";

export const prerender = false;

const NOISE_PATTERNS = [
  /^chrome-extension:/i,
  /^moz-extension:/i,
  /^safari-extension:/i,
  /^edge-extension:/i,
  /^webkit-masked-url:/i,
];

function isNoise(blockedUri: string | null | undefined): boolean {
  if (!blockedUri) return false;
  return NOISE_PATTERNS.some((re) => re.test(blockedUri));
}

interface CspReportLegacy {
  "csp-report": {
    "document-uri"?: string;
    "violated-directive"?: string;
    "blocked-uri"?: string;
    "original-policy"?: string;
    "source-file"?: string;
    "line-number"?: number;
  };
}

export const POST: APIRoute = async ({ request }) => {
  // High limit — a chatty page can fire 50+ reports on first paint.
  const rl = rateLimit({ key: `csp:${clientIp(request)}`, limit: 60, windowMs: 60_000 });
  if (!rl.ok) return new Response(null, { status: 204 });

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  // Normalize to a flat shape regardless of legacy/modern.
  let report: Record<string, unknown> | null = null;
  if (Array.isArray(payload) && payload[0]?.type === "csp-violation") {
    report = payload[0].body as Record<string, unknown>;
  } else if (payload && typeof payload === "object" && "csp-report" in (payload as object)) {
    report = (payload as CspReportLegacy)["csp-report"] as unknown as Record<string, unknown>;
  }
  if (!report) return new Response(null, { status: 204 });

  const blocked = (report["blocked-uri"] ?? report["blockedURL"]) as string | undefined;
  if (isNoise(blocked)) return new Response(null, { status: 204 });

  const documentUri = (report["document-uri"] ?? report["documentURL"]) as string | undefined;
  const directive = (report["violated-directive"] ?? report["effectiveDirective"]) as string | undefined;
  const sourceFile = (report["source-file"] ?? report["sourceFile"]) as string | undefined;
  const lineNumber = (report["line-number"] ?? report["lineNumber"]) as number | undefined;
  const userAgent = request.headers.get("user-agent") ?? null;

  // Persist to csp_violations. Awaited + try/catched.
  try {
    await raw`
      INSERT INTO csp_violations (document_uri, directive, blocked_uri, source_file, line_number, user_agent)
      VALUES (${documentUri ?? null}, ${directive ?? null}, ${blocked ?? null},
              ${sourceFile ?? null}, ${lineNumber ?? null}, ${userAgent})
    `;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[csp-violation] DB insert failed:", err instanceof Error ? err.message : err);
  }

  // Also log so wrangler tail can stream live during deploys.
  // eslint-disable-next-line no-console
  console.warn("[csp-violation]", { documentUri, directive, blocked, sourceFile, lineNumber });

  return new Response(null, { status: 204 });
};
