import { getAllPosts } from "@/lib/posts";
import { siteConfig } from "../../config/site.config";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();

  const blogPosts = posts.map((post) => ({
    url: `${siteConfig.url}/blog/${post.slug}`,
    lastModified: new Date(post.frontmatter.date),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteConfig.url}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...blogPosts,
  ];
}
