import { generateArticleSchema, generateFAQSchema, generateBreadcrumbSchema } from "@/lib/seo";
import type { PostFrontmatter } from "@/lib/posts";

export default function ArticleSchema({ post }: { post: PostFrontmatter }) {
  const articleSchema = generateArticleSchema(post);
  const faqSchema = generateFAQSchema(post.faq);
  const breadcrumbSchema = generateBreadcrumbSchema(
    post.slug,
    post.title,
    post.category
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
