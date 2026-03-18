import { getTrendingTopics } from "./utils/trends";
import { analyzeKeywords, type KeywordOpportunity } from "./utils/keywords";
import { siteConfig } from "../config/site.config";
import fs from "fs";
import path from "path";

async function runResearch(): Promise<KeywordOpportunity[]> {
  console.log("🔍 Starting keyword research...\n");

  // Pick 5-6 niches to research today (broader coverage for more ideas)
  const shuffled = [...siteConfig.niches].sort(() => Math.random() - 0.5);
  const todaysNiches = shuffled.slice(0, 6);

  console.log(`📊 Researching niches: ${todaysNiches.join(", ")}\n`);

  // Get Google Trends data
  console.log("📈 Fetching Google Trends data...");
  const trendData = await getTrendingTopics(todaysNiches);

  console.log(
    `✅ Got trends for ${trendData.filter((t) => t.relatedQueries.length > 0).length}/${todaysNiches.length} niches\n`
  );

  // Analyze with Claude — get 6-8 ideas
  console.log("🧠 Analyzing keywords with Claude (generating 6-8 ideas)...");
  const opportunities = await analyzeKeywords(trendData);

  console.log(`\n✅ Found ${opportunities.length} topic ideas:\n`);
  opportunities.forEach((opp, i) => {
    console.log(`  ${i + 1}. "${opp.title}"`);
    console.log(`     Keyword: ${opp.primaryKeyword}`);
    console.log(`     Difficulty: ${opp.estimatedDifficulty} | Intent: ${opp.searchIntent}`);
    console.log(`     Category: ${opp.category}`);
    console.log(`     Why: ${opp.customerGenerationReason}\n`);
  });

  // Save all ideas for review
  const outputDir = path.join(process.cwd(), "content");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const researchData = {
    date: new Date().toISOString(),
    status: "pending_approval",
    ideas: opportunities.map((opp, i) => ({
      id: i + 1,
      ...opp,
    })),
  };

  fs.writeFileSync(
    path.join(outputDir, "pending-topics.json"),
    JSON.stringify(researchData, null, 2)
  );

  console.log(`\n📋 ${opportunities.length} ideas saved to content/pending-topics.json`);
  console.log("⏳ Waiting for approval via Slack...\n");

  return opportunities;
}

// Allow running standalone or importing
export { runResearch };

if (require.main === module) {
  runResearch()
    .then(() => console.log("✅ Research complete! Check Slack for the morning brief."))
    .catch((err) => {
      console.error("❌ Research failed:", err);
      process.exit(1);
    });
}
