import { Feed } from "feed";
import { getAllPosts } from "@/lib/posts";
import { siteConfig } from "../../../config/site.config";

export async function GET() {
  const posts = getAllPosts();

  const feed = new Feed({
    title: `${siteConfig.name} Blog`,
    description: siteConfig.description,
    id: siteConfig.url,
    link: siteConfig.url,
    language: "en",
    image: `${siteConfig.url}/images/og-default.png`,
    copyright: `${new Date().getFullYear()} ${siteConfig.name}`,
    author: {
      name: siteConfig.author.name,
      link: siteConfig.social.website,
    },
  });

  posts.forEach((post) => {
    const { frontmatter, content } = post;
    feed.addItem({
      title: frontmatter.title,
      id: `${siteConfig.url}/blog/${post.slug}/`,
      link: `${siteConfig.url}/blog/${post.slug}/`,
      description: frontmatter.description,
      content: content.slice(0, 2000),
      author: [{ name: frontmatter.author }],
      date: new Date(frontmatter.date),
      image: frontmatter.image
        ? `${siteConfig.url}${frontmatter.image}`
        : undefined,
      category: frontmatter.category
        ? [{ name: frontmatter.category }]
        : undefined,
    });
  });

  return new Response(feed.rss2(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
