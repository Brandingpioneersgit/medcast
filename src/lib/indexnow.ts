const INDEXNOW_HOSTS = [
  "api.indexnow.org",
  "www.bing.com",
  "yandex.com",
];

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    "https://medcasts.com"
  ).replace(/\/$/, "");
}

export function getIndexNowKey(): string | null {
  return process.env.INDEXNOW_KEY ?? null;
}

export type IndexNowSubmitResult = {
  ok: boolean;
  host: string;
  status: number;
  error?: string;
};

async function submitTo(host: string, body: unknown): Promise<IndexNowSubmitResult> {
  try {
    const res = await fetch(`https://${host}/indexnow`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, host, status: res.status };
  } catch (err) {
    return { ok: false, host, status: 0, error: String(err) };
  }
}

export async function pingIndexNow(urls: string[]): Promise<{
  submitted: number;
  results: IndexNowSubmitResult[];
  reason?: string;
}> {
  const key = getIndexNowKey();
  if (!key) {
    return { submitted: 0, results: [], reason: "INDEXNOW_KEY not set" };
  }
  if (!Array.isArray(urls) || urls.length === 0) {
    return { submitted: 0, results: [], reason: "no urls" };
  }
  if (urls.length > 10_000) {
    return { submitted: 0, results: [], reason: "max 10,000 urls per batch" };
  }

  const site = getSiteUrl();
  const host = new URL(site).host;
  const absoluteUrls = urls.map((u) => (u.startsWith("http") ? u : `${site}${u.startsWith("/") ? u : "/" + u}`));

  const body = {
    host,
    key,
    keyLocation: `${site}/indexnow-key/${key}.txt`,
    urlList: absoluteUrls,
  };

  const results = await Promise.all(INDEXNOW_HOSTS.map((h) => submitTo(h, body)));
  const submitted = results.filter((r) => r.ok).length;
  return { submitted, results };
}
