import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { siteConfig } from "../config/site.config";
import { calculateReadingTime } from "./utils/ai-optimize";
import type { KeywordOpportunity } from "./utils/keywords";

interface GeneratedPost {
  frontmatter: string;
  content: string;
  filePath: string;
}

async function generateArticle(
  opportunity: KeywordOpportunity
): Promise<GeneratedPost> {
  console.log(`\n✍️  Generating article: "${opportunity.title}"...\n`);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const today = new Date().toISOString().split("T")[0];

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `You are a senior content strategist writing for ${siteConfig.name} — an AI-powered pay-per-result advertising agency.

BRAND VOICE:
${siteConfig.tone}
- Use specific numbers and data points
- Challenge conventional agency models
- Position ${siteConfig.name}'s pay-per-result model as the smarter alternative
- Write like an insider sharing trade secrets, not a marketer selling something
- Do NOT use Hormozi-style copy or generic marketing speak

ARTICLE BRIEF:
- Title: ${opportunity.title}
- Primary Keyword: ${opportunity.primaryKeyword}
- Secondary Keywords: ${opportunity.secondaryKeywords.join(", ")}
- Category: ${opportunity.category}
- Angle: ${opportunity.angle}
- Search Intent: ${opportunity.searchIntent}

STRUCTURE REQUIREMENTS:
1. Opening paragraph (2-3 sentences): Start with a compelling data point or bold claim. Include the primary keyword naturally. This paragraph must directly answer the search intent — AI models will extract this as a featured snippet.

2. Table of contents-friendly H2 and H3 headings throughout (use ## and ### markdown). Include keywords in headings naturally.

3. Write ${siteConfig.wordsPerPost}+ words of substantive content:
   - Include real statistics and data points (cite sources naturally)
   - Use numbered lists and bullet points for scanability
   - Include practical, actionable advice
   - Add comparison tables where relevant
   - Naturally mention ${siteConfig.name}'s approach 2-3 times (not salesy, just factual)

4. Include a mid-article callout like:
   > **Want results without the retainer?** ${siteConfig.name} charges per qualified customer delivered. [${siteConfig.cta.text}](${siteConfig.cta.url})

5. FAQ Section: Write 5 detailed FAQs related to the topic. Each answer should be 2-3 sentences. These MUST address the following "People Also Ask" questions:
${opportunity.peopleAlsoAsk.map((q) => `   - ${q}`).join("\n")}

IMPORTANT FOR AI SEARCH VISIBILITY:
- Use clear, factual statements that AI models can extract
- Answer questions directly before elaborating
- Use structured data: lists, tables, definitions
- Include semantic variations of the primary keyword
- Write like an authoritative encyclopedia entry at the top, then get conversational

OUTPUT FORMAT:
Write ONLY the article content in markdown. Do NOT include the title as an H1 (it's in frontmatter). Start directly with the opening paragraph. Use ## for main sections and ### for subsections.

At the very end, after the main content, write a section labeled "## Frequently Asked Questions" with the 5 FAQs. Format each as:
### Question here?
Answer here.`,
      },
    ],
  });

  const articleContent =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract FAQs from the content for structured data
  const faqRegex =
    /###\s+(.+\?)\s*\n\s*([\s\S]*?)(?=###\s+.+\?|\n## |\n$|$)/g;
  const faqs: { question: string; answer: string }[] = [];
  let faqMatch;
  while ((faqMatch = faqRegex.exec(articleContent)) !== null) {
    const answer = faqMatch[2].trim();
    if (answer.length > 20) {
      faqs.push({ question: faqMatch[1].trim(), answer });
    }
  }

  const readingTime = calculateReadingTime(articleContent);

  // Build frontmatter
  const frontmatterObj = {
    title: opportunity.title,
    description: `${opportunity.angle}. Expert insights on ${opportunity.primaryKeyword} from ${siteConfig.name}.`,
    date: today,
    slug: opportunity.slug,
    keywords: [
      opportunity.primaryKeyword,
      ...opportunity.secondaryKeywords,
    ],
    category: opportunity.category,
    image: `/images/posts/${opportunity.slug}.png`,
    imageAlt: `${opportunity.title} — ${siteConfig.name}`,
    author: siteConfig.author.name,
    readingTime,
    faq: faqs.slice(0, 5),
  };

  const frontmatter = `---
title: "${frontmatterObj.title.replace(/"/g, '\\"')}"
description: "${frontmatterObj.description.replace(/"/g, '\\"')}"
date: "${frontmatterObj.date}"
slug: "${frontmatterObj.slug}"
keywords:
${frontmatterObj.keywords.map((k) => `  - "${k}"`).join("\n")}
category: "${frontmatterObj.category}"
image: "${frontmatterObj.image}"
imageAlt: "${frontmatterObj.imageAlt.replace(/"/g, '\\"')}"
author: "${frontmatterObj.author}"
readingTime: "${frontmatterObj.readingTime}"
faq:
${frontmatterObj.faq
  .map(
    (f) =>
      `  - question: "${f.question.replace(/"/g, '\\"')}"\n    answer: "${f.answer.replace(/"/g, '\\"').replace(/\n/g, " ")}"`
  )
  .join("\n")}
---`;

  const fullContent = `${frontmatter}\n\n${articleContent}`;

  // Save to file
  const postsDir = path.join(process.cwd(), "content/posts");
  if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });

  const filePath = path.join(postsDir, `${opportunity.slug}.mdx`);
  fs.writeFileSync(filePath, fullContent, "utf-8");

  console.log(`✅ Article saved: ${filePath}`);
  console.log(`   Words: ~${articleContent.split(/\s+/).length}`);
  console.log(`   FAQs: ${faqs.length}`);
  console.log(`   Reading time: ${readingTime}\n`);

  return { frontmatter, content: articleContent, filePath };
}

export { generateArticle };

if (require.main === module) {
  // Read from latest research
  const researchPath = path.join(process.cwd(), "content/latest-research.json");
  if (!fs.existsSync(researchPath)) {
    console.error("❌ No research data found. Run `npm run research` first.");
    process.exit(1);
  }

  const research = JSON.parse(fs.readFileSync(researchPath, "utf-8"));
  generateArticle(research.selected)
    .then(() => console.log("✅ Article generation complete!"))
    .catch((err) => {
      console.error("❌ Generation failed:", err);
      process.exit(1);
    });
}
