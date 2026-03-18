// AI search optimization helpers
// These ensure content is structured for AI model extraction

export function generateFAQFromContent(
  questions: string[],
  answers: string[]
): { question: string; answer: string }[] {
  return questions.map((q, i) => ({
    question: q,
    answer: answers[i] || "",
  }));
}

export function calculateReadingTime(content: string): string {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generateExcerpt(content: string, maxLength = 160): string {
  // Strip markdown
  const plain = content
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*|__/g, "")
    .replace(/\*|_/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n+/g, " ")
    .trim();

  if (plain.length <= maxLength) return plain;
  return plain.substring(0, maxLength - 3).replace(/\s+\S*$/, "") + "...";
}
