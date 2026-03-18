import fs from "fs";
import path from "path";
import { generateArticle } from "./generate";
import { generateImages } from "./images";
import type { KeywordOpportunity } from "./utils/keywords";

interface PendingData {
  date: string;
  status: string;
  ideas: (KeywordOpportunity & { id: number })[];
}

async function generateBatch(selectedIds: number[]) {
  const startTime = Date.now();

  console.log("🚀 SEO Blog Machine — Batch Publishing\n");
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`📝 Generating ${selectedIds.length} articles: [${selectedIds.join(", ")}]\n`);
  console.log("=".repeat(50));

  // Read pending topics
  const topicsPath = path.join(process.cwd(), "content/pending-topics.json");
  if (!fs.existsSync(topicsPath)) {
    console.error("❌ No pending topics found. Run research first.");
    process.exit(1);
  }

  const data: PendingData = JSON.parse(fs.readFileSync(topicsPath, "utf-8"));

  // Get selected topics
  const selectedTopics = selectedIds
    .map((id) => data.ideas.find((idea) => idea.id === id))
    .filter((t): t is PendingData["ideas"][0] => t !== undefined);

  if (selectedTopics.length === 0) {
    console.error("❌ No valid topics found for the given IDs.");
    console.error(`   Available IDs: ${data.ideas.map((i) => i.id).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n✅ Found ${selectedTopics.length} topics to generate:\n`);
  selectedTopics.forEach((t) => {
    console.log(`   ${t.id}. ${t.title}`);
  });

  const results: { title: string; slug: string; success: boolean; error?: string }[] = [];

  // Generate each article sequentially (to avoid API rate limits)
  for (let i = 0; i < selectedTopics.length; i++) {
    const topic = selectedTopics[i];
    console.log(`\n${"=".repeat(50)}`);
    console.log(`📌 ARTICLE ${i + 1}/${selectedTopics.length}: "${topic.title}"\n`);

    try {
      // Generate article content
      const article = await generateArticle(topic);

      // Generate images
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

    // Small delay between articles to avoid rate limits
    if (i < selectedTopics.length - 1) {
      console.log("\n⏳ Waiting 5s before next article...\n");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  // Update pending topics status
  data.status = "published";
  fs.writeFileSync(topicsPath, JSON.stringify(data, null, 2));

  // Save publish log
  const logPath = path.join(process.cwd(), "content/publish-log.json");
  let log: unknown[] = [];
  if (fs.existsSync(logPath)) {
    log = JSON.parse(fs.readFileSync(logPath, "utf-8"));
  }

  log.push({
    date: new Date().toISOString(),
    batchSize: selectedTopics.length,
    articles: results,
    durationSeconds: parseFloat(((Date.now() - startTime) / 1000).toFixed(1)),
  });

  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const successes = results.filter((r) => r.success).length;
  const failures = results.filter((r) => !r.success).length;

  console.log(`\n${"=".repeat(50)}`);
  console.log(`\n🏁 BATCH COMPLETE\n`);
  console.log(`   ✅ Published: ${successes}`);
  if (failures > 0) console.log(`   ❌ Failed: ${failures}`);
  console.log(`   ⏱️  Duration: ${duration}s`);
  console.log(`\n   Articles:`);
  results.forEach((r) => {
    const icon = r.success ? "✅" : "❌";
    console.log(`     ${icon} ${r.title}`);
  });

  // Send completion notification to Slack
  await notifyCompletion(results);

  console.log(`\n💡 Git commit & push to trigger Vercel deployment.\n`);
}

async function notifyCompletion(
  results: { title: string; slug: string; success: boolean }[]
) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const successes = results.filter((r) => r.success);
  const siteUrl = process.env.SITE_URL || "https://blog.seenbymany.com";

  const articleList = successes
    .map((r) => `• <${siteUrl}/blog/${r.slug}/|${r.title}>`)
    .join("\n");

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `✅ *${successes.length} articles published!*\n\n${articleList}\n\n_Deploying to Vercel now..._`,
      }),
    });
  } catch {
    // Silently fail — articles are published regardless
  }
}

// Parse CLI arguments: "1,3,5" or "1 3 5"
const args = process.argv.slice(2).join(",");
const selectedIds = args
  .split(/[,\s]+/)
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => !isNaN(n));

if (selectedIds.length === 0) {
  console.error("❌ Usage: npx tsx scripts/generate-batch.ts 1,3,5");
  console.error("   Pass the topic IDs to generate (from pending-topics.json)");
  process.exit(1);
}

generateBatch(selectedIds).catch((err) => {
  console.error("\n❌ Batch generation failed:", err);
  process.exit(1);
});
