import { getAllPosts, getAllCategories } from "@/lib/posts";
import BlogCard from "@/components/BlogCard";
import type { Metadata } from "next";
import { siteConfig } from "../../../config/site.config";

export const metadata: Metadata = {
  title: "Blog — Performance Marketing & AI Advertising Insights",
  description: `Expert insights on performance marketing, AI advertising, and customer acquisition from ${siteConfig.name}.`,
};

export default function BlogPage() {
  const posts = getAllPosts();
  const categories = getAllCategories();

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="mb-12">
        <h1 className="font-heading font-bold text-4xl md:text-5xl tracking-tighter text-white mb-4">
          Blog
        </h1>
        <p className="text-sbm-muted text-lg max-w-2xl">
          Data-backed strategies for scaling your advertising. New articles daily.
        </p>
      </div>

      {/* Category filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-10">
          <span className="text-xs font-mono text-sbm-indigo bg-sbm-indigo/10 px-3 py-1.5 rounded-full cursor-pointer hover:bg-sbm-indigo/20 transition-colors">
            All
          </span>
          {categories.map((cat) => (
            <span
              key={cat}
              className="text-xs font-mono text-sbm-muted bg-sbm-bg-tertiary px-3 py-1.5 rounded-full cursor-pointer hover:text-sbm-indigo hover:bg-sbm-indigo/10 transition-colors"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Posts Grid */}
      {posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <div className="sbm-card p-12 text-center max-w-xl mx-auto">
          <p className="font-mono text-sbm-indigo text-sm mb-4">
            Pipeline active
          </p>
          <h2 className="font-heading font-bold text-2xl tracking-tighter text-white mb-3">
            Posts Publishing Soon
          </h2>
          <p className="text-sbm-muted">
            The automated SEO engine is researching and generating content.
            Check back shortly.
          </p>
        </div>
      )}
    </div>
  );
}
