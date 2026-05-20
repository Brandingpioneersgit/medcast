export const revalidate = 3600;

import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateMeta } from "@/lib/utils/seo";
import { getTranslations as getContent, translated } from "@/lib/utils/translate";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ locale: string; postSlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale, postSlug } = await params;
  const post = await db.query.blogPosts.findFirst({
    where: and(eq(blogPosts.slug, postSlug), eq(blogPosts.status, "published")),
  });
  if (!post) return {};

  const map = await getContent("blog_post", post.id, locale);

  return generateMeta({
    title: map.metaTitle ?? map.title ?? post.metaTitle ?? post.title,
    description: map.metaDescription ?? map.excerpt ?? post.metaDescription ?? post.excerpt ?? "",
    path: `/blog/${postSlug}`,
    locale,
    image: post.coverImageUrl || undefined,
    type: "article",
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, postSlug } = await params;
  setRequestLocale(locale);

  const postRaw = await db.query.blogPosts.findFirst({
    where: and(eq(blogPosts.slug, postSlug), eq(blogPosts.status, "published")),
  });
  if (!postRaw) notFound();

  const map = await getContent("blog_post", postRaw.id, locale);
  const post = translated(postRaw, map, ["title", "excerpt", "content", "metaTitle", "metaDescription"]);

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ background: "var(--color-paper)", borderBottom: "1px solid var(--color-border-soft)" }}>
        <div className="mx-auto w-full max-w-[90rem] px-5 md:px-8 py-4">
          <nav className="mono text-[12px]" style={{ color: "var(--color-ink-subtle)" }} aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink">Home</Link>
            <span className="mx-1.5">/</span>
            <Link href="/blog" className="hover:text-ink">Journal</Link>
            <span className="mx-1.5">/</span>
            <span className="truncate max-w-xs inline-block align-bottom" style={{ color: "var(--color-ink)" }}>
              {post.title}
            </span>
          </nav>
        </div>
      </div>

      {/* Article header */}
      <article>
        <header className="py-12 md:py-16">
          <div className="mx-auto w-full max-w-[48rem] px-5 md:px-8">
            {post.category && (
              <p
                className="mono uppercase"
                style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--color-accent)" }}
              >
                {post.category}
              </p>
            )}
            <h1
              className="display display-tight mt-4"
              style={{
                fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)",
                lineHeight: 1.05,
                fontWeight: 400,
                letterSpacing: "-0.025em",
              }}
            >
              {post.title}
            </h1>
            {post.excerpt && (
              <p
                className="serif mt-5"
                style={{ fontSize: 21, lineHeight: 1.45, color: "var(--color-ink-muted)" }}
              >
                {post.excerpt}
              </p>
            )}
            <div
              className="mono tnum mt-6 inline-flex items-center gap-3 text-[12px]"
              style={{ letterSpacing: "0.08em", color: "var(--color-ink-subtle)" }}
            >
              {post.authorName && <span>By {post.authorName}</span>}
              {post.authorName && post.publishedAt && (
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--color-border)" }} />
              )}
              {post.publishedAt && (
                <span>
                  {post.publishedAt.toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
        </header>

        {post.coverImageUrl && (
          <div className="mx-auto w-full max-w-[64rem] px-5 md:px-8 mb-10">
            <div
              className="paper-flat overflow-hidden"
              style={{ borderRadius: "var(--radius-lg)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={post.coverImageUrl} alt={post.title} className="w-full h-auto" />
            </div>
          </div>
        )}

        <div className="mx-auto w-full max-w-[48rem] px-5 md:px-8 pb-16">
          <div
            className="prose-editorial"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <div
            className="mt-14 pt-8"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-[14px] font-medium"
              style={{ color: "var(--color-accent)" }}
            >
              <ArrowLeft className="h-4 w-4 mirror-x" /> Back to Journal
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
