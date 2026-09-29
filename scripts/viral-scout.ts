import { viralConfig } from "../config/viral.config";
import { scrapeViral, type ViralSource } from "./viral/apify";
import { generateVideoIdeas, type VideoIdea } from "./viral/ideas";
import { loadHistory, savePending } from "./viral/store";
import { postToSlack, header, section, divider } from "./viral/slack";

/**
 * STEP 1 of the Viral Video Engine:
 * scrape viral X + YouTube posts (Apify) → Claude writes avatar scripts → save for approval.
 */
async function runViralScout(): Promise<VideoIdea[]> {
  console.log("🔥 Viral Scout — finding what's taking off on X + YouTube\n");

  const topics = [...viralConfig.searchTopics]
    .sort(() => Math.random() - 0.5)
    .slice(0, viralConfig.topicsPerRun);
  console.log(`📊 Topics today: ${topics.join(", ")}\n`);

  console.log("🕷️  Scraping via Apify...");
  const used = new Set(loadHistory().usedSourceUrls);
  const sources = (await scrapeViral(topics)).filter((s) => !used.has(s.url));
  console.log(`\n✅ ${sources.length} fresh viral posts found\n`);

  if (sources.length === 0) throw new Error("No viral sources found — check APIFY_TOKEN and thresholds in config/viral.config.ts");

  const top = pickTop(sources, viralConfig.topSourcesForIdeation);
  console.log("🏆 Top sources:");
  top.slice(0, 10).forEach((s) =>
    console.log(`  [${s.viralityScore}] ${s.platform.toUpperCase()} ${s.author}: ${s.text.replace(/\s+/g, " ").slice(0, 80)}`)
  );

  console.log(`\n🧠 Claude is writing ${viralConfig.ideasPerRun} avatar scripts...`);
  const ideas = await generateVideoIdeas(top);
  ideas.sort((a, b) => b.viralPotential - a.viralPotential).forEach((idea, i) => (idea.id = i + 1));

  savePending({ date: new Date().toISOString(), status: "pending_approval", sources: top, ideas });
  console.log(`\n📋 ${ideas.length} ideas saved to content/video-ideas/pending.json\n`);
  ideas.forEach((i) => console.log(`  ${i.id}. [${i.viralPotential}/10] ${i.title} — ${i.avatar} (~${i.estimatedSeconds}s)\n     Hook: "${i.hook}"`));

  await sendBrief(ideas);
  return ideas;
}

/** Keep the mix balanced so one platform doesn't crowd out the other. */
function pickTop(sources: ViralSource[], n: number): ViralSource[] {
  const x = sources.filter((s) => s.platform === "x");
  const yt = sources.filter((s) => s.platform === "youtube");
  const picked = [...x.slice(0, Math.ceil(n / 2)), ...yt.slice(0, Math.floor(n / 2))];
  const rest = sources.filter((s) => !picked.includes(s));
  return [...picked, ...rest].slice(0, n).sort((a, b) => b.viralityScore - a.viralityScore);
}

async function sendBrief(ideas: VideoIdea[]) {
  const repoUrl = process.env.GITHUB_REPO_URL || "https://github.com/YOUR_REPO";
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const ideaText = (i: VideoIdea) =>
    `*${i.id}. ${i.title}*  ·  🔥 ${i.viralPotential}/10  ·  🎭 ${i.avatar}  ·  ⏱ ~${i.estimatedSeconds}s  ·  _${i.format}_
🎣 *Hook:* "${i.hook}"
💡 ${i.whyItWillWork}
🔗 Inspired by: ${i.sourceUrls.slice(0, 2).map((u, n) => `<${u}|source ${n + 1}>`).join(" · ") || "—"}`;

  await postToSlack(
    [
      header(`🎬 Viral Video Brief — ${date}`),
      section(`Claude scanned what's going viral on X + YouTube and wrote *${ideas.length} avatar scripts*. Pick the ones to render with HeyGen.`),
      divider,
      ...ideas.map((i) => section(ideaText(i))),
      divider,
      section(
        `*To render:* <${repoUrl}/actions/workflows/viral-videos.yml|GitHub Actions → Viral Video Engine> → Run workflow → mode \`produce\` → enter ids (e.g. \`1,3\`).\nFull scripts: \`content/video-ideas/pending.json\``
      ),
    ],
    ideas.map(ideaText).join("\n\n")
  );
}

export { runViralScout };

if (require.main === module) {
  runViralScout()
    .then(() => console.log("\n✅ Scout complete"))
    .catch((err) => {
      console.error("❌ Viral scout failed:", err);
      process.exit(1);
    });
}
