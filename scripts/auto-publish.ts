import fs from "fs";
import path from "path";
import { runResearch } from "./research";
import { generateArticle } from "./generate";
import { generateImages } from "./images";
import { siteConfig } from "../config/site.config";
import type { KeywordOpportunity } from "./utils/keywords";

/**
 * Fully automated pipeline: research → select best topics → generate → publish
 * Designed to run daily via GitHub Actions cron
 */

const POSTS_PER_DAY = parseInt(process.env.POSTS_PER_DAY || String(siteConfig.postsPerDay), 10);

function selectBestTopics(
  ideas: (KeywordOpportunity & { id: number })[],
  count: number
): (KeywordOpportunity & { id: number })[] {
  // Score each topic for auto-selection
  const scored = ideas.map((idea) => {
    let score = 0;

    // Prefer low difficulty (easiest to rank)
    if (idea.estimatedDifficulty === "low") score += 3;
    else if (idea.estimatedDifficulty === "medium") score += 1;

    // Prefer commercial/transactional intent (closer to conversion)
    if (idea.searchIntent === "transactional") score += 3;
    else if (idea.searchIntent === "commercial") score += 2;
    else if (idea.searchIntent === "informational") score += 1;

    // Prefer variety in categories (bonus for unique categories)
    score += 1;

    return { ...idea, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Pick top N, ensuring category variety
  const selected: typeof scored = [];
  const usedCategories = new Set<string>();

  // First pass: one per category
  for (const topic of scored) {
    if (selected.length >= count) break;
    if (!usedCategories.has(topic.category)) {
      selected.push(topic);
      usedCategories.add(topic.category);
    }
  }

  // Second pass: fill remaining slots with highest-scored
  for (const topic of scored) {
    if (selected.length >= count) break;
    if (!selected.find((s) => s.id === topic.id)) {
      selected.push(topic);
    }
  }

  return selected.slice(0, count);
}

async function autoPublish() {
  const startTime = Date.now();

  console.log("🤖 SEO Blog Machine — Fully Automated Pipeline\n");
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🎯 Target: ${POSTS_PER_DAY} posts today\n`);
  console.log("=".repeat(60));

  // Step 1: Research
  console.log("\n📊 STEP 1: Running keyword research...\n");
  const allIdeas = await runResearch();

  if (allIdeas.length === 0) {
    console.error("❌ Research returned no ideas. Aborting.");
    process.exit(1);
  }

  // Step 2: Auto-select best topics
  console.log(`\n🧠 STEP 2: Auto-selecting ${POSTS_PER_DAY} best topics...\n`);
  const ideasWithIds = allIdeas.map((idea, i) => ({ ...idea, id: i + 1 }));
  const selected = selectBestTopics(ideasWithIds, POSTS_PER_DAY);

  console.log(`✅ Selected ${selected.length} topics:\n`);
  selected.forEach((t, i) => {
    console.log(`   ${i + 1}. [${t.estimatedDifficulty}] ${t.title}`);
    console.log(`      Category: ${t.category} | Intent: ${t.searchIntent}`);
  });

  // Step 3: Generate articles
  console.log(`\n✍️  STEP 3: Generating ${selected.length} articles...\n`);
  console.log("=".repeat(60));

  const results: { title: string; slug: string; success: boolean; error?: string }[] = [];

  for (let i = 0; i < selected.length; i++) {
    const topic = selected[i];
    console.log(`\n📌 ARTICLE ${i + 1}/${selected.length}: "${topic.title}"\n`);

    try {
      const article = await generateArticle(topic);
      const images = await generateImages(topic);

      // Update MDX with correct image path if using SVG placeholder
      if (images.featuredPath.endsWith(".svg")) {
        let mdxContent = fs.readFileSync(article.filePath, "utf-8");
        mdxContent = mdxContent.replace(
          `image: "/images/posts/${topic.slug}.png"`,
          `image: "${images.featuredPath}"`
        );
        fs.writeFileSync(article.filePath, mdxContent);
      }

      results.push({ title: topic.title, slug: topic.slug, success: true });
      console.log(`✅ Article ${i + 1} complete!`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Article ${i + 1} failed: ${errMsg}`);
      results.push({ title: topic.title, slug: topic.slug, success: false, error: errMsg });
    }

    // Delay between articles to avoid rate limits
    if (i < selected.length - 1) {
      console.log("\n⏳ Waiting 5s before next article...\n");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  // Step 4: Save publish log
  const logPath = path.join(process.cwd(), "content/publish-log.json");
  let log: unknown[] = [];
  if (fs.existsSync(logPath)) {
    try {
      log = JSON.parse(fs.readFileSync(logPath, "utf-8"));
    } catch {
      log = [];
    }
  }

  log.push({
    date: new Date().toISOString(),
    mode: "auto",
    batchSize: selected.length,
    articles: results,
    durationSeconds: parseFloat(((Date.now() - startTime) / 1000).toFixed(1)),
  });

  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));

  // Step 5: Summary & Slack notification
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`\n🏁 AUTO-PUBLISH COMPLETE\n`);
  console.log(`   ✅ Published: ${successes.length}`);
  if (failures.length > 0) console.log(`   ❌ Failed: ${failures.length}`);
  console.log(`   ⏱️  Duration: ${duration}s`);
  console.log(`\n   Articles:`);
  results.forEach((r) => {
    const icon = r.success ? "✅" : "❌";
    console.log(`     ${icon} ${r.title}`);
  });

  // Send Slack notification
  await notifySlack(results, duration);

  console.log(`\n💡 Git commit & push will trigger Vercel deployment.\n`);
}

async function notifySlack(
  results: { title: string; slug: string; success: boolean }[],
  duration: string
) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);
  const siteUrl = process.env.SITE_URL || "https://blog.seenbymany.com";

  const articleList = successes
    .map((r) => `• <${siteUrl}/blog/${r.slug}/|${r.title}>`)
    .join("\n");

  const failureText =
    failures.length > 0
      ? `\n\n⚠️ ${failures.length} article(s) failed to generate.`
      : "";

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `🤖 Auto-Published ${successes.length} Articles`,
              emoji: true,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${articleList}${failureText}\n\n⏱️ Generated in ${duration}s | _Auto-deploying to Vercel now..._`,
            },
          },
        ],
      }),
    });
    console.log("✅ Slack notification sent!");
  } catch {
    console.log("⚠️ Slack notification failed (articles still published)");
  }
}

autoPublish().catch((err) => {
  console.error("\n❌ Auto-publish pipeline failed:", err);
  process.exit(1);
});
