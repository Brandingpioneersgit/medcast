import { db } from "../src/lib/db";
import { blogPosts } from "../src/lib/db/schema";

(async () => {
  const rows = await db.select().from(blogPosts);
  console.log("count:", rows.length);
  console.log("rows:", rows.map((x) => ({ slug: x.slug, status: x.status, published: !!x.publishedAt })));
  process.exit(0);
})();
