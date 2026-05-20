/**
 * IndexNow API — push-based indexing for Bing, Yandex, Naver, Seznam, Yep.
 * Posting a list of URLs here is up to ~10,000× faster than waiting for
 * crawlers to discover sitemap deltas. Endpoint accepts up to 10,000 URLs
 * per submission.
 *
 * Setup: a stable hex key file is hosted at `/<KEY>.txt` (in `public/`)
 * with the key as its only content. The protocol's only auth is "the
 * domain serving the key file owns the key" — keep this key out of source
 * control if you ever roll it.
 *
 * Reference: https://www.indexnow.org/documentation
 */

const HOST = "medcasts.com";
const KEY = "a7a7c5fa42b6f10da12152f6ba8114cd";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

export interface PingResult {
  ok: boolean;
  status: number;
  body?: string;
}

/**
 * Submit one or more URLs for indexing. URLs must be on the configured HOST.
 * Returns `{ ok, status }`. Bing's docs note 200/202 are both success.
 */
export async function pingIndexNow(urls: string[]): Promise<PingResult> {
  if (urls.length === 0) return { ok: true, status: 200 };
  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls.slice(0, 10000),
  };
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const ok = res.status === 200 || res.status === 202;
    return { ok, status: res.status, body: ok ? undefined : await res.text() };
  } catch (err) {
    return { ok: false, status: 0, body: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Single-URL ping using the GET form — useful from Astro endpoints / hooks
 * where you want to fire-and-forget on content publish.
 */
export async function pingOne(url: string): Promise<PingResult> {
  const params = new URLSearchParams({ url, key: KEY, keyLocation: KEY_LOCATION });
  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`);
    const ok = res.status === 200 || res.status === 202;
    return { ok, status: res.status, body: ok ? undefined : await res.text() };
  } catch (err) {
    return { ok: false, status: 0, body: err instanceof Error ? err.message : String(err) };
  }
}
