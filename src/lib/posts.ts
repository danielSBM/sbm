import fs from "fs";
import path from "path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "content/posts");

export interface PostFrontmatter {
  title: string;
  description: string;
  date: string;
  slug: string;
  keywords: string[];
  category: string;
  image: string;
  imageAlt: string;
  author: string;
  readingTime: string;
  faq: { question: string; answer: string }[];
}

export interface Post {
  frontmatter: PostFrontmatter;
  content: string;
  slug: string;
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const files = fs.readdirSync(postsDirectory).filter((f) => f.endsWith(".mdx"));

  const posts = files
    .map((filename) => {
      const filePath = path.join(postsDirectory, filename);
      const fileContents = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(fileContents);

      return {
        frontmatter: data as PostFrontmatter,
        content,
        slug: data.slug || filename.replace(/\.mdx$/, ""),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.frontmatter.date).getTime() -
        new Date(a.frontmatter.date).getTime()
    );

  return posts;
}

export function getPostBySlug(slug: string): Post | null {
  const posts = getAllPosts();
  return posts.find((p) => p.slug === slug) || null;
}

export function getAllCategories(): string[] {
  const posts = getAllPosts();
  const categories = new Set(posts.map((p) => p.frontmatter.category));
  return Array.from(categories);
}

export function getRelatedPosts(currentSlug: string, limit = 3): Post[] {
  const currentPost = getPostBySlug(currentSlug);
  if (!currentPost) return [];

  const allPosts = getAllPosts().filter((p) => p.slug !== currentSlug);

  // Score by shared keywords and same category
  const scored = allPosts.map((post) => {
    let score = 0;
    if (post.frontmatter.category === currentPost.frontmatter.category) {
      score += 5;
    }
    const sharedKeywords = post.frontmatter.keywords?.filter((k) =>
      currentPost.frontmatter.keywords?.includes(k)
    );
    score += (sharedKeywords?.length || 0) * 2;
    return { post, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.post);
}
