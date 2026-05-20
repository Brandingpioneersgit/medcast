export const revalidate = 600;

import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateMeta } from "@/lib/utils/seo";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return generateMeta({
    title: "Journal — Medical travel insights & patient stories",
    description: "Expert articles on medical tourism, treatment guides, hospital reviews, and patient stories.",
    path: "/blog",
    locale,
  });
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  let posts: (typeof blogPosts.$inferSelect)[] = [];
  try {
    posts = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.status, "published"))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(30);
  } catch {
    posts = [];
  }

  const [featured, ...rest] = posts;

  return (
    <>
      {/* Page header */}
      <div style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-10 md:py-14">
          <p
            className="mono uppercase mb-3 tnum"
            style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--color-ink-subtle)" }}
          >
            {posts.length} stories · updated weekly
          </p>
          <h1
            className="display display-tight"
            style={{
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              lineHeight: 1,
              fontWeight: 400,
              letterSpacing: "-0.03em",
            }}
          >
            The <span className="italic-display">journal.</span>
          </h1>
          <p className="lede mt-4 max-w-[44rem]">
            Medical travel insights, treatment guides and patient stories — written by
            the same medical panel that reviews your case.
          </p>
        </div>
      </div>

      {posts.length === 0 ? (
        <section className="py-20">
          <div className="mx-auto w-full max-w-[40rem] px-5 md:px-8 text-center">
            <p style={{ color: "var(--color-ink-subtle)" }}>
              No stories published yet. Check back soon.
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* Featured post */}
          {featured && (
            <section className="py-10 md:py-14">
              <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
                <Link
                  href={`/blog/${featured.slug}` as "/"}
                  className="paper grid gap-8 md:grid-cols-[1.4fr,1fr] overflow-hidden transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                  style={{ padding: 0 }}
                >
                  <div
                    className="photo-block relative"
                    style={{ aspectRatio: "16/10" }}
                  >
                    {featured.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={featured.coverImageUrl}
                        alt={featured.title}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-6 md:p-8 flex flex-col justify-center">
                    <p
                      className="mono uppercase"
                      style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
                    >
                      Featured · {featured.category ?? "Story"}
                    </p>
                    <h2
                      className="display mt-3"
                      style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)", letterSpacing: "-0.02em", lineHeight: 1.1, fontWeight: 400 }}
                    >
                      {featured.title}
                    </h2>
                    {featured.excerpt && (
                      <p
                        className="serif mt-3 line-clamp-3"
                        style={{ fontSize: 17, color: "var(--color-ink-muted)", lineHeight: 1.55 }}
                      >
                        {featured.excerpt}
                      </p>
                    )}
                    {featured.publishedAt && (
                      <div
                        className="mono mt-5 tnum text-[12px]"
                        style={{ letterSpacing: "0.08em", color: "var(--color-ink-subtle)" }}
                      >
                        {featured.publishedAt.toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            </section>
          )}

          {/* Grid of remaining posts */}
          {rest.length > 0 && (
            <section
              className="py-10 md:py-14"
              style={{
                background: "var(--color-paper)",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8">
                <p
                  className="mono uppercase mb-3"
                  style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
                >
                  Latest
                </p>
                <h2 className="display" style={{ fontSize: 30, letterSpacing: "-0.02em" }}>
                  Recent stories
                </h2>
                <ul className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {rest.map((post) => (
                    <li key={post.id}>
                      <Link
                        href={`/blog/${post.slug}` as "/"}
                        className="paper block overflow-hidden transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md"
                        style={{ padding: 0 }}
                      >
                        <div
                          className="photo-block relative"
                          style={{ aspectRatio: "16/10" }}
                        >
                          {post.coverImageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={post.coverImageUrl}
                              alt={post.title}
                              className="absolute inset-0 h-full w-full object-cover"
                              loading="lazy"
                            />
                          )}
                        </div>
                        <div className="p-5">
                          {post.category && (
                            <p
                              className="mono uppercase"
                              style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "var(--color-accent)" }}
                            >
                              {post.category}
                            </p>
                          )}
                          <h3
                            className="serif mt-2"
                            style={{ fontSize: 19, fontWeight: 500, letterSpacing: "-0.005em", lineHeight: 1.3 }}
                          >
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p
                              className="mt-2 text-[13.5px] line-clamp-2"
                              style={{ color: "var(--color-ink-muted)", lineHeight: 1.5 }}
                            >
                              {post.excerpt}
                            </p>
                          )}
                          {post.publishedAt && (
                            <div
                              className="mono mt-4 tnum text-[11px]"
                              style={{ letterSpacing: "0.08em", color: "var(--color-ink-subtle)" }}
                            >
                              {post.publishedAt.toLocaleDateString(undefined, {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
