import { runResearch } from "./research";
import { generateArticle } from "./generate";
import { generateImages } from "./images";
import fs from "fs";
import path from "path";

async function publishPost() {
  const startTime = Date.now();
  console.log("🚀 SEO Blog Machine — Daily Publishing Pipeline\n");
  console.log(`📅 ${new Date().toISOString()}\n`);
  console.log("=".repeat(50));

  // Step 1: Keyword Research
  console.log("\n📌 STEP 1: Keyword Research\n");
  const opportunity = await runResearch();

  // Step 2: Generate Article
  console.log("\n📌 STEP 2: Content Generation\n");
  const article = await generateArticle(opportunity);

  // Step 3: Generate Images
  console.log("\n📌 STEP 3: Image Generation\n");
  const images = await generateImages(opportunity);

  // Update the MDX file with correct image paths if using SVG placeholders
  if (images.featuredPath.endsWith(".svg")) {
    const mdxPath = article.filePath;
    let mdxContent = fs.readFileSync(mdxPath, "utf-8");
    mdxContent = mdxContent.replace(
      `image: "/images/posts/${opportunity.slug}.png"`,
      `image: "${images.featuredPath}"`
    );
    fs.writeFileSync(mdxPath, mdxContent);
  }

  // Step 4: Log results
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n" + "=".repeat(50));
  console.log("\n✅ PUBLISHING COMPLETE\n");
  console.log(`  Title: ${opportunity.title}`);
  console.log(`  Slug: ${opportunity.slug}`);
  console.log(`  Category: ${opportunity.category}`);
  console.log(`  Keyword: ${opportunity.primaryKeyword}`);
  console.log(`  File: ${article.filePath}`);
  console.log(`  Featured Image: ${images.featuredPath}`);
  console.log(`  Duration: ${duration}s`);

  // Save publish log
  const logDir = path.join(process.cwd(), "content");
  const logPath = path.join(logDir, "publish-log.json");

  let log: unknown[] = [];
  if (fs.existsSync(logPath)) {
    log = JSON.parse(fs.readFileSync(logPath, "utf-8"));
  }

  log.push({
    date: new Date().toISOString(),
    title: opportunity.title,
    slug: opportunity.slug,
    category: opportunity.category,
    primaryKeyword: opportunity.primaryKeyword,
    filePath: article.filePath,
    imagePath: images.featuredPath,
    durationSeconds: parseFloat(duration),
  });

  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));

  console.log(`\n📋 Publish log updated: ${logPath}`);
  console.log(
    "\n💡 Next step: Git commit & push to trigger Vercel deployment.\n"
  );
}

publishPost().catch((err) => {
  console.error("\n❌ Publishing pipeline failed:", err);
  process.exit(1);
});
