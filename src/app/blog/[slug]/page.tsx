import { getAllPosts, getPostBySlug, getRelatedPosts } from "@/lib/posts";
import { siteConfig } from "../../../../config/site.config";
import ArticleSchema from "@/components/ArticleSchema";
import CTABanner from "@/components/CTABanner";
import TableOfContents, { extractTOC } from "@/components/TableOfContents";
import BlogCard from "@/components/BlogCard";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Metadata } from "next";

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const post = getPostBySlug(params.slug);
  if (!post) return {};

  const { frontmatter } = post;

  return {
    title: frontmatter.title,
    description: frontmatter.description,
    keywords: frontmatter.keywords,
    openGraph: {
      type: "article",
      title: frontmatter.title,
      description: frontmatter.description,
      url: `${siteConfig.url}/blog/${params.slug}/`,
      images: frontmatter.image
        ? [{ url: `${siteConfig.url}${frontmatter.image}`, width: 1200, height: 630 }]
        : [],
      publishedTime: frontmatter.date,
      authors: [frontmatter.author],
    },
    twitter: {
      card: "summary_large_image",
      title: frontmatter.title,
      description: frontmatter.description,
      images: frontmatter.image ? [`${siteConfig.url}${frontmatter.image}`] : [],
    },
    alternates: {
      canonical: `${siteConfig.url}/blog/${params.slug}/`,
    },
  };
}

export default function BlogPostPage({ params }: Props) {
  const post = getPostBySlug(params.slug);

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 className="font-heading font-bold text-4xl tracking-tighter text-white mb-4">
          Post Not Found
        </h1>
        <p className="text-sbm-muted">This article doesn&apos;t exist.</p>
      </div>
    );
  }

  const { frontmatter, content } = post;
  const tocItems = extractTOC(content);
  const relatedPosts = getRelatedPosts(params.slug, 3);

  return (
    <>
      <ArticleSchema post={frontmatter} />

      <article className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero */}
        <header className="max-w-3xl mx-auto mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-mono text-sbm-indigo bg-sbm-indigo/10 px-2 py-1 rounded">
              {frontmatter.category}
            </span>
            <span className="text-xs text-sbm-muted-dark">
              {frontmatter.readingTime}
            </span>
          </div>
          <h1 className="font-heading font-bold text-4xl md:text-5xl tracking-tighter text-white mb-4">
            {frontmatter.title}
          </h1>
          <p className="text-sbm-muted text-lg mb-6">
            {frontmatter.description}
          </p>
          <div className="flex items-center gap-3 text-sm text-sbm-muted-dark">
            <span className="font-medium text-white">
              {frontmatter.author}
            </span>
            <span>&middot;</span>
            <time dateTime={frontmatter.date}>
              {new Date(frontmatter.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
          </div>
        </header>

        {/* Featured Image */}
        {frontmatter.image && (
          <div className="max-w-4xl mx-auto mb-12 rounded-2xl overflow-hidden">
            <img
              src={frontmatter.image}
              alt={frontmatter.imageAlt || frontmatter.title}
              className="w-full"
            />
          </div>
        )}

        {/* Content + TOC Layout */}
        <div className="flex gap-12 max-w-6xl mx-auto">
          {/* Main Content */}
          <div className="prose-sbm max-w-3xl flex-1 min-w-0">
            <MDXRemote source={content} />

            {/* FAQ Section */}
            {frontmatter.faq && frontmatter.faq.length > 0 && (
              <section className="mt-16">
                <h2 className="text-white font-heading font-bold text-2xl md:text-3xl tracking-tighter mb-8">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-6">
                  {frontmatter.faq.map((item, i) => (
                    <div
                      key={i}
                      className="sbm-card p-6"
                    >
                      <h3 className="font-heading font-bold text-lg text-white mb-2">
                        {item.question}
                      </h3>
                      <p className="text-sbm-muted text-base">
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* CTA */}
            <CTABanner />

            {/* Author Bio */}
            <div className="sbm-card p-6 mt-12 flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-sbm-gradient flex-shrink-0 flex items-center justify-center">
                <span className="text-white font-heading font-bold">
                  {siteConfig.author.name.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-heading font-bold text-white">
                  {siteConfig.author.name}
                </p>
                <p className="text-sbm-indigo text-sm mb-2">
                  {siteConfig.author.role} at {siteConfig.author.company}
                </p>
                <p className="text-sbm-muted text-sm">
                  {siteConfig.author.bio}
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar TOC */}
          {tocItems.length > 0 && (
            <aside className="hidden xl:block w-64 flex-shrink-0">
              <TableOfContents items={tocItems} />
            </aside>
          )}
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="max-w-6xl mx-auto mt-20">
            <h2 className="font-heading font-bold text-2xl tracking-tighter text-white mb-8">
              Related Articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((related) => (
                <BlogCard key={related.slug} post={related} />
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}
