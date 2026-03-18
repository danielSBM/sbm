import fs from "fs";
import path from "path";
import { siteConfig } from "../config/site.config";
import type { KeywordOpportunity } from "./utils/keywords";

interface GeneratedImage {
  featuredPath: string;
  inArticlePath: string;
}

async function generateImages(
  opportunity: KeywordOpportunity
): Promise<GeneratedImage> {
  console.log(`🎨 Generating images for: "${opportunity.title}"...\n`);

  const apiKey = process.env.NANOBANANA_API_KEY;
  const apiUrl = process.env.NANOBANANA_API_URL;

  if (!apiKey || !apiUrl || apiKey.startsWith("REPLACE")) {
    console.log("⚠️  Nanobanana 2 API not configured. Creating placeholder images.\n");
    return createPlaceholderImages(opportunity.slug);
  }

  const imagesDir = path.join(process.cwd(), "public/images/posts");
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

  const featuredPrompt = `${siteConfig.imagePromptModifier} The image represents the concept of "${opportunity.title}" for a blog about ${opportunity.category.toLowerCase()}. 4:5 crop, 1200x630 resolution.`;

  const inArticlePrompt = `${siteConfig.imagePromptModifier} Abstract visualization of ${opportunity.primaryKeyword}. Minimalist data visualization or abstract tech concept. 16:9 crop, 800x450 resolution.`;

  try {
    // Generate featured image
    console.log("  Generating featured image (1200x630)...");
    const featuredImage = await callNanobananaAPI(apiUrl, apiKey, featuredPrompt, 1200, 630);
    const featuredPath = path.join(imagesDir, `${opportunity.slug}.png`);
    fs.writeFileSync(featuredPath, featuredImage);
    console.log(`  ✅ Featured image saved: ${featuredPath}`);

    // Generate in-article image
    console.log("  Generating in-article image (800x450)...");
    const inArticleImage = await callNanobananaAPI(apiUrl, apiKey, inArticlePrompt, 800, 450);
    const inArticlePath = path.join(imagesDir, `${opportunity.slug}-content.png`);
    fs.writeFileSync(inArticlePath, inArticleImage);
    console.log(`  ✅ In-article image saved: ${inArticlePath}\n`);

    return {
      featuredPath: `/images/posts/${opportunity.slug}.png`,
      inArticlePath: `/images/posts/${opportunity.slug}-content.png`,
    };
  } catch (error) {
    console.error("⚠️  Image generation failed, using placeholders:", error);
    return createPlaceholderImages(opportunity.slug);
  }
}

async function callNanobananaAPI(
  apiUrl: string,
  apiKey: string,
  prompt: string,
  width: number,
  height: number
): Promise<Buffer> {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      width,
      height,
      num_images: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Nanobanana API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Handle different response formats
  if (data.images && data.images[0]) {
    // Base64 response
    return Buffer.from(data.images[0], "base64");
  } else if (data.url) {
    // URL response
    const imgResponse = await fetch(data.url);
    return Buffer.from(await imgResponse.arrayBuffer());
  } else if (data.data && data.data[0]?.b64_json) {
    // OpenAI-style response
    return Buffer.from(data.data[0].b64_json, "base64");
  }

  throw new Error("Unexpected API response format");
}

function createPlaceholderImages(slug: string): GeneratedImage {
  const imagesDir = path.join(process.cwd(), "public/images/posts");
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

  // Create SVG placeholder with SBM branding
  const createSVG = (w: number, h: number, text: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:0.3" />
      <stop offset="50%" style="stop-color:#8b5cf6;stop-opacity:0.2" />
      <stop offset="100%" style="stop-color:#a855f7;stop-opacity:0.1" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#0a0a0f"/>
  <rect width="${w}" height="${h}" fill="url(#grad)"/>
  <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#6366f1" font-family="sans-serif" font-size="18" font-weight="bold">SEEN BY MANY</text>
  <text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" fill="#a1a1aa" font-family="sans-serif" font-size="13">${text}</text>
</svg>`;

  const featuredPath = path.join(imagesDir, `${slug}.png`);
  const inArticlePath = path.join(imagesDir, `${slug}-content.png`);

  // Save as SVG (will render fine in browsers)
  fs.writeFileSync(
    featuredPath.replace(".png", ".svg"),
    createSVG(1200, 630, "Featured Image — Replace with nanobanana 2")
  );
  fs.writeFileSync(
    inArticlePath.replace(".png", ".svg"),
    createSVG(800, 450, "Content Image — Replace with nanobanana 2")
  );

  console.log("  ✅ Placeholder SVGs created (configure nanobanana 2 API for real images)\n");

  return {
    featuredPath: `/images/posts/${slug}.svg`,
    inArticlePath: `/images/posts/${slug}-content.svg`,
  };
}

export { generateImages };

if (require.main === module) {
  const researchPath = path.join(process.cwd(), "content/latest-research.json");
  if (!fs.existsSync(researchPath)) {
    console.error("❌ No research data found. Run `npm run research` first.");
    process.exit(1);
  }

  const research = JSON.parse(fs.readFileSync(researchPath, "utf-8"));
  generateImages(research.selected)
    .then(() => console.log("✅ Image generation complete!"))
    .catch((err) => {
      console.error("❌ Image generation failed:", err);
      process.exit(1);
    });
}
