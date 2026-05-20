export type RssItem = {
  title: string;
  link: string;
  description?: string;
  pubDate?: Date;
  guid?: string;
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderRss({
  title,
  description,
  link,
  self,
  items,
}: {
  title: string;
  description: string;
  link: string;
  self: string;
  items: RssItem[];
}): string {
  const now = new Date().toUTCString();
  const xmlItems = items
    .map((i) => {
      const guid = i.guid ?? i.link;
      const pub = (i.pubDate ?? new Date()).toUTCString();
      return `    <item>
      <title>${escapeXml(i.title)}</title>
      <link>${escapeXml(i.link)}</link>
      <guid isPermaLink="true">${escapeXml(guid)}</guid>
      <pubDate>${pub}</pubDate>${
        i.description
          ? `\n      <description>${escapeXml(i.description)}</description>`
          : ""
      }
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${escapeXml(link)}</link>
    <description>${escapeXml(description)}</description>
    <atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${now}</lastBuildDate>
    <language>en</language>
${xmlItems}
  </channel>
</rss>`;
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    "https://medcasts.com"
  ).replace(/\/$/, "");
}
