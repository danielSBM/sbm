import Link from "next/link";
import type { Post } from "@/lib/posts";

export default function BlogCard({ post }: { post: Post }) {
  const { frontmatter } = post;

  return (
    <Link href={`/blog/${post.slug}`} className="sbm-card group block">
      {frontmatter.image && (
        <div className="aspect-[16/9] overflow-hidden">
          <img
            src={frontmatter.image}
            alt={frontmatter.imageAlt || frontmatter.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-mono text-sbm-indigo bg-sbm-indigo/10 px-2 py-1 rounded">
            {frontmatter.category}
          </span>
          <span className="text-xs text-sbm-muted-dark">
            {frontmatter.readingTime}
          </span>
        </div>
        <h2 className="font-heading font-bold text-xl tracking-tighter text-white group-hover:text-sbm-indigo transition-colors mb-2 line-clamp-2">
          {frontmatter.title}
        </h2>
        <p className="text-sbm-muted text-sm line-clamp-3">
          {frontmatter.description}
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs text-sbm-muted-dark">
          <span>{frontmatter.author}</span>
          <span>&middot;</span>
          <time dateTime={frontmatter.date}>
            {new Date(frontmatter.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        </div>
      </div>
    </Link>
  );
}
