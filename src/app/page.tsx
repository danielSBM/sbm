import { getAllPosts } from "@/lib/posts";
import { siteConfig } from "../../config/site.config";
import BlogCard from "@/components/BlogCard";
import Link from "next/link";

export default function HomePage() {
  const posts = getAllPosts();
  const latestPosts = posts.slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto px-6">
      {/* Hero */}
      <section className="py-20 md:py-32 text-center">
        <h1 className="font-heading font-bold text-5xl md:text-7xl tracking-tighter text-white mb-6 max-w-4xl mx-auto">
          Advertising Insights That{" "}
          <span className="sbm-gradient-text">Actually Work</span>
        </h1>
        <p className="text-sbm-muted text-lg md:text-xl max-w-2xl mx-auto mb-8">
          Data-driven strategies for performance marketing, AI advertising, and
          customer acquisition. By the team at {siteConfig.name}.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/blog" className="sbm-cta">
            Read the Blog
          </Link>
          <a
            href={siteConfig.cta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="sbm-cta-outline"
          >
            {siteConfig.cta.text}
          </a>
        </div>
      </section>

      {/* Latest Posts */}
      {latestPosts.length > 0 ? (
        <section className="pb-20">
          <div className="flex items-center justify-between mb-10">
            <h2 className="font-heading font-bold text-3xl tracking-tighter text-white">
              Latest Articles
            </h2>
            <Link
              href="/blog"
              className="text-sbm-indigo text-sm hover:underline"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestPosts.map((post) => (
              <BlogCard key={post.slug} post={post} />
            ))}
          </div>
        </section>
      ) : (
        <section className="pb-20 text-center">
          <div className="sbm-card p-12 max-w-xl mx-auto">
            <p className="font-mono text-sbm-indigo text-sm mb-4">
              System initialized
            </p>
            <h2 className="font-heading font-bold text-2xl tracking-tighter text-white mb-3">
              First Post Coming Soon
            </h2>
            <p className="text-sbm-muted">
              The automated publishing pipeline is active. The first AI-researched,
              SEO-optimized article will be published shortly.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
