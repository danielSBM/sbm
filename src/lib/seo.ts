import { siteConfig } from "../../config/site.config";
import type { PostFrontmatter } from "./posts";

export function generateArticleSchema(post: PostFrontmatter) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: `${siteConfig.url}${post.image}`,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Person",
      name: siteConfig.author.name,
      jobTitle: siteConfig.author.role,
      worksFor: {
        "@type": "Organization",
        name: siteConfig.name,
      },
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.social.website,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteConfig.url}/blog/${post.slug}/`,
    },
    keywords: post.keywords?.join(", "),
  };
}

export function generateFAQSchema(faq: { question: string; answer: string }[]) {
  if (!faq || faq.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function generateBreadcrumbSchema(
  slug: string,
  title: string,
  category: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItemOf",
        position: 1,
        name: "Home",
        item: siteConfig.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${siteConfig.url}/blog/`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: category,
        item: `${siteConfig.url}/blog/?category=${encodeURIComponent(category)}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: title,
        item: `${siteConfig.url}/blog/${slug}/`,
      },
    ],
  };
}
