import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { siteConfig } from "../config/site.config";
import { getTodaysCities, getTemplateForCity, type CityTarget, LOCAL_TEMPLATES } from "../config/us-cities";
import { calculateReadingTime } from "./utils/ai-optimize";
import { generateImages } from "./images";
import type { KeywordOpportunity } from "./utils/keywords";

/**
 * Generate a local SEO article for a specific city
 * Optimized for both traditional search AND AI search engines (ChatGPT, Perplexity, Claude)
 */
async function generateLocalArticle(city: CityTarget, templateIndex: number) {
  const template = LOCAL_TEMPLATES[templateIndex % LOCAL_TEMPLATES.length];
  const year = new Date().getFullYear();
  const today = new Date().toISOString().split("T")[0];

  const citySlug = city.city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
  const stateSlug = city.stateAbbr.toLowerCase();

  const title = template.titleTemplate
    .replace("{city}", city.city)
    .replace("{stateAbbr}", city.stateAbbr)
    .replace("{year}", String(year));

  const slug = template.slugTemplate
    .replace("{citySlug}", citySlug)
    .replace("{stateSlug}", stateSlug);

  const primaryKeyword = template.primaryKeywordTemplate
    .replace("{city}", city.city)
    .replace("{stateAbbr}", city.stateAbbr);

  console.log(`\n🏙️  Generating local article: "${title}"...\n`);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `You are a senior content strategist writing for ${siteConfig.name} — an AI-powered pay-per-result advertising agency.

BRAND VOICE:
${siteConfig.tone}

ARTICLE BRIEF:
- Title: ${title}
- Primary Keyword: ${primaryKeyword}
- City: ${city.city}, ${city.state} (${city.stateAbbr})
- City Size: ${city.population} market
- Region: ${city.region}
- Category: ${template.category}
- Angle: ${template.angle}
- Search Intent: ${template.searchIntent}

LOCAL SEO REQUIREMENTS:
1. Mention "${city.city}" and "${city.city}, ${city.stateAbbr}" naturally throughout (at least 8-10 times)
2. Reference local business landscape, industries, and economy specific to ${city.city}
3. Include location-specific data points where possible
4. Mention nearby cities/metro area naturally for broader geo targeting
5. Address challenges specific to ${city.population === "small" ? "smaller market" : city.population === "mid" ? "mid-size city" : "major metro"} businesses

=== AI SEARCH OPTIMIZATION (CRITICAL) ===
This article MUST be optimized for citation by AI search engines (ChatGPT, Perplexity, Claude, Gemini). Follow these rules:

1. ANSWER CAPSULE: Start every major section with a direct, factual answer in 40-60 words BEFORE elaborating. AI models extract the first 1-2 sentences to determine if content answers a query.

2. STRUCTURED FACTS: Include specific statistics, numbers, and data points every 150-200 words. Pages with original data get 4x more AI citations.

3. CLEAR DEFINITIONS: When introducing concepts, provide clear dictionary-style definitions that AI can extract as standalone answers.

4. QUESTION-BASED H2/H3 HEADERS: Use headers phrased as questions people ask (e.g., "How much does a marketing agency cost in ${city.city}?") — these match how people query AI chatbots.

5. COMPARISON FORMAT: Use comparison tables and "X vs Y" sections — AI models love structured comparisons for generating answers.

6. NEUTRAL AUTHORITATIVE TONE: Write like an expert encyclopedia entry. AI systems deprioritize overly promotional content. Be factual first, then conversational.

7. SEMANTIC KEYWORD VARIATIONS: Use multiple phrasings of the same concept (e.g., "marketing agency", "advertising firm", "digital marketing company", "ad agency") so AI models connect your content to more queries.

8. CITE SOURCES: Reference real data sources naturally (e.g., "According to HubSpot's 2025 Marketing Report...") — this builds the trust signals AI models look for.

=== END AI OPTIMIZATION ===

STRUCTURE REQUIREMENTS:
1. Opening paragraph (2-3 sentences): Start with a compelling local data point or statistic about ${city.city} businesses. Include the primary keyword naturally. This MUST directly answer the search intent — AI models will extract this as a featured snippet.

2. Use ## for main sections and ### for subsections. Include keywords in headings naturally.

3. Write ${siteConfig.wordsPerPost}+ words of substantive content:
   - Real statistics and data points
   - Numbered lists and bullet points for scanability
   - Practical, actionable advice specific to ${city.city}
   - Comparison tables (retainer agencies vs pay-per-result)
   - Naturally mention ${siteConfig.name}'s approach 2-3 times

4. Include a mid-article callout:
   > **Want results without the retainer?** ${siteConfig.name} charges per qualified customer delivered to ${city.city} businesses. [${siteConfig.cta.text}](${siteConfig.cta.url})

5. FAQ Section: Write 5 FAQs specific to ${city.city}. Each answer 2-3 sentences. Include the city name in at least 3 FAQ answers.

OUTPUT FORMAT:
Write ONLY the article content in markdown. Do NOT include the title as H1. Start with the opening paragraph. End with "## Frequently Asked Questions" section with 5 FAQs formatted as ### Question? / Answer.`,
      },
    ],
  });

  const articleContent =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract FAQs for structured data
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
  const secondaryKeywords = [
    `digital marketing ${city.city}`,
    `advertising agency ${city.city} ${city.stateAbbr}`,
    `${city.city} marketing company`,
    `online marketing ${city.city}`,
    `${city.city} business advertising`,
    `pay per result marketing ${city.city}`,
  ];

  const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${template.angle}. Expert guide for ${city.city}, ${city.stateAbbr} businesses from ${siteConfig.name}."
date: "${today}"
slug: "${slug}"
keywords:
${[primaryKeyword, ...secondaryKeywords].map((k) => `  - "${k}"`).join("\n")}
category: "${template.category}"
image: "/images/posts/${slug}.svg"
imageAlt: "${title} — ${siteConfig.name}"
author: "${siteConfig.author.name}"
readingTime: "${readingTime}"
localSeo:
  city: "${city.city}"
  state: "${city.state}"
  stateAbbr: "${city.stateAbbr}"
  region: "${city.region}"
faq:
${faqs
  .slice(0, 5)
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

  const filePath = path.join(postsDir, `${slug}.mdx`);
  fs.writeFileSync(filePath, fullContent, "utf-8");

  console.log(`✅ Local article saved: ${filePath}`);
  console.log(`   Words: ~${articleContent.split(/\s+/).length}`);
  console.log(`   City: ${city.city}, ${city.stateAbbr}`);
  console.log(`   FAQs: ${faqs.length}`);

  // Generate images
  const opportunity: KeywordOpportunity = {
    title,
    slug,
    primaryKeyword,
    secondaryKeywords,
    category: template.category,
    angle: template.angle,
    searchIntent: template.searchIntent,
    estimatedDifficulty: "low",
    peopleAlsoAsk: faqs.map((f) => f.question),
    customerGenerationReason: `Local business owners in ${city.city} searching for marketing help`,
  };

  const images = await generateImages(opportunity);

  // Update image path if SVG
  if (images.featuredPath.endsWith(".svg")) {
    let mdxContent = fs.readFileSync(filePath, "utf-8");
    mdxContent = mdxContent.replace(
      `image: "/images/posts/${slug}.svg"`,
      `image: "${images.featuredPath}"`
    );
    fs.writeFileSync(filePath, mdxContent);
  }

  return { title, slug, city: city.city, state: city.stateAbbr, filePath };
}

/**
 * Main: generate local SEO articles for today's cities
 */
async function runLocalSEO() {
  const startTime = Date.now();
  const cities = getTodaysCities(2);

  console.log("🏙️  SEO Blog Machine — Local SEO Pipeline\n");
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🎯 Generating articles for ${cities.length} cities:\n`);
  cities.forEach((c, i) => {
    const template = getTemplateForCity(i);
    console.log(`   ${i + 1}. ${c.city}, ${c.stateAbbr} (${c.population}) — "${template.id}"`);
  });
  console.log("\n" + "=".repeat(60));

  const results: { title: string; slug: string; city: string; success: boolean; error?: string }[] = [];

  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    const templateIndex = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    ) + i;

    try {
      const result = await generateLocalArticle(city, templateIndex);
      results.push({ ...result, success: true });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed for ${city.city}: ${errMsg}`);
      results.push({ title: "", slug: "", city: city.city, success: false, error: errMsg });
    }

    if (i < cities.length - 1) {
      console.log("\n⏳ Waiting 5s...\n");
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  // Slack notification
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (webhookUrl) {
    const successes = results.filter((r) => r.success);
    const siteUrl = process.env.SITE_URL || "https://blog.seenbymany.com";

    const articleList = successes
      .map((r) => `• 🏙️ <${siteUrl}/blog/${r.slug}/|${r.title}>`)
      .join("\n");

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🏙️ *Local SEO: ${successes.length} city articles published!*\n\n${articleList}\n\n_Auto-deploying to Vercel now..._`,
        }),
      });
    } catch { /* silent */ }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`\n🏁 LOCAL SEO COMPLETE — ${results.filter((r) => r.success).length} articles in ${duration}s\n`);
}

export { generateLocalArticle, runLocalSEO };

if (require.main === module) {
  runLocalSEO().catch((err) => {
    console.error("❌ Local SEO failed:", err);
    process.exit(1);
  });
}
