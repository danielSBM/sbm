import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import {
  type AdvertorialTemplate,
  type AdvertorialBrief,
  getAdvertorialTemplate,
  listAdvertorialTemplates,
  ADVERTORIAL_TEMPLATES,
} from "../config/advertorial-templates";

/**
 * Advertorial Generator
 *
 * Produces complete, publish-ready HTML advertorials using the
 * proven 5-stage architecture:
 *
 *  1. The Hook — Specific character + emotional setup
 *  2. The Emotional Breaking Point — The moment that breaks the reader
 *  3. The Failed Solutions — Why what they've tried doesn't work
 *  4. The Mechanism — New belief shift / root cause reframe
 *  5. The Payoff — Story resolution + CTA fork-in-the-road
 *
 * Usage:
 *   npx tsx scripts/generate-advertorial.ts --template hearing-aid --product "ClearSound Pro" --cta "https://example.com/order" --client "ClearSound Inc"
 *   npx tsx scripts/generate-advertorial.ts --list   (show available templates)
 */

// ─── Types ───────────────────────────────────────────────────────

interface GeneratedAdvertorial {
  html: string;
  copyJson: AdvertorialCopy;
  filePath: string;
  wordCount: number;
}

interface AdvertorialCopy {
  headline: string;
  subtitle: string;
  metaDescription: string;
  categoryTag: string;
  authorName: string;
  authorTitle: string;
  heroImageAlt: string;
  heroImageCaption: string;
  hook: {
    opening: string;
    paragraph2: string;
    paragraph3: string;
  };
  breakingPoint: {
    heading: string;
    paragraph1: string;
    paragraph2: string;
    quote: string;
    quoteAttribution: string;
    paragraph3: string;
  };
  failedSolutions: {
    heading: string;
    intro: string;
    solution1: string;
    solution2: string;
    solution3: string;
    keyReframeQuote: string;
    conclusion: string;
  };
  mechanism: {
    heading: string;
    intro: string;
    calloutTitle: string;
    explanation: string;
    analogy: string;
    authorityParagraph: string;
    urgencyParagraph: string;
    midCtaText: string;
    midCtaButtonText: string;
  };
  payoff: {
    heading: string;
    paragraph1: string;
    paragraph2: string;
    paragraph3: string;
    emotionalResolution: string;
  };
  cta: {
    heading: string;
    stayPath: string;
    changePath: string;
    buttonText: string;
    guaranteeText: string;
    urgencyNote: string;
  };
  comparisonRows: { feature: string; product: string; competitor: string }[];
  testimonials: { stars: number; quote: string; name: string; detail: string }[];
}

// ─── Prompt Builder ──────────────────────────────────────────────

function buildPrompt(template: AdvertorialTemplate, brief: AdvertorialBrief): string {
  return `You are a world-class direct response copywriter. Your advertorials convert at 2-4x industry average because you understand that emotion comes first, logic comes second. Always.

You are writing a long-form advertorial (1,500-2,000 words of body copy) for a native ad campaign. The advertorial must feel like editorial content — NOT an ad. It should read like a feature article in a health/lifestyle publication.

=== PRODUCT & AUDIENCE ===
Product Name: ${brief.productName}
Client: ${brief.clientName}
Niche: ${template.niche}
Target Audience: ${template.audience}
Age Range: ${template.ageRange}

=== THE PROBLEM ===
Core Problem: ${template.coreProblem}
Emotional Cost (the deeper layer — use this, don't just describe the symptom):
${template.emotionalCost}

=== FAILED SOLUTIONS (the "old way") ===
${template.failedSolutions.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Why they fail: ${template.whyOldWayFails}

=== THE MECHANISM (belief shift — this is the most important section) ===
Mechanism Name: ${template.mechanism.name}
How it works: ${template.mechanism.explanation}
Analogy to use: ${template.mechanism.analogy}

=== BORROWED AUTHORITY ===
${template.borrowedAuthority.map((a) => `- ${a}`).join("\n")}

=== PRODUCT DETAILS ===
Price: ${template.product.price} (was ${template.product.originalPrice})
Guarantee: ${template.product.guarantee}
Key Features:
${template.product.keyFeatures.map((f) => `- ${f}`).join("\n")}
Friction Killers:
${template.product.frictionKillers.map((f) => `- ${f}`).join("\n")}

=== TRUST STACK ===
Media: ${template.trustStack.mediaLogos.join(", ")}
Expert: ${template.trustStack.expertEndorsement}
Reviews: ${template.trustStack.reviewCount} verified reviews

=== CTA FRAMING ===
Stay Path: "${template.ctaFraming.stayPath}"
Change Path: "${template.ctaFraming.changePath}"
Button: "${template.ctaFraming.buttonText}"
Urgency: "${template.ctaFraming.urgencyNote}"

=== ARCHITECTURE (follow this EXACTLY) ===

**SECTION 1 — THE HOOK (3 paragraphs)**
Create a specific, named character. Give them an age, a profession, a defining detail that makes them feel real. NOT "a man with [problem]" — make them vivid. An architect. A retired teacher. A former marathon runner.

The first paragraph uses a drop-cap and introduces the character in the middle of their life — a moment that shows who they WERE before the problem took hold.

The second paragraph shows the problem creeping in. Not the clinical symptom — the emotional toll. They're becoming a secondary character in their own life.

The third paragraph mirrors the reader's inner experience. Name the specific behaviors the reader does but has never said out loud: the polite nod, the declined invitations, the secret workarounds. When the reader feels personally seen, they'll follow the story anywhere.

**SECTION 2 — THE EMOTIONAL BREAKING POINT (heading + 3 paragraphs + pull quote)**
Introduce a loved one (grandchild, spouse, close friend). Create a SPECIFIC moment where the problem causes a painful interaction. The loved one doesn't get angry — they show quiet acceptance or pity. That's worse.

This section must be the most emotionally intense paragraph in the entire piece. It should make the reader's chest tight. The pull quote should capture the devastating moment in one line.

This is what makes the reader emotionally ready to accept a solution. Not logically ready. Emotionally ready.

**SECTION 3 — THE FAILED SOLUTIONS (heading + paragraphs + reframe quote)**
Walk through what the character already tried. For each failed solution, explain WHY it fails — not just that it didn't work, but the mechanism of failure.

Build to the key reframe quote — the line where the character (or an expert) articulates the real problem in plain language. Like: "I don't need the dishwasher to be louder. I need to hear you."

End with the bridge: the old solutions treat the symptom. Something else is going on.

**SECTION 4 — THE MECHANISM (heading + paragraphs + science callout + authority)**
Introduce the new explanation for WHY the problem exists. This is the belief shift.

Use the science callout box for the mechanism explanation. Include the analogy to make it instantly understandable.

Drop the borrowed authority reference. The implication should be slightly terrifying: ignoring this problem has consequences beyond the obvious symptom.

Include a mid-article CTA — soft, not pushy.

This one-two punch (new mechanism + fear of consequences) creates urgency that doesn't feel like marketing. It feels like medical/expert advice.

**SECTION 5 — THE PAYOFF (heading + 4 paragraphs)**
Return to the character's story. They discover the product. Describe the first moment of relief with sensory detail.

Then create the MIRROR IMAGE of the breaking point from Section 2. The same loved one, the same type of moment — but now it resolves beautifully. The emotional wound from earlier is closed.

The reader must experience the full arc: loss → pain → discovery → resolution. By the time they reach the CTA, they're not evaluating a product. They're imagining themselves in the character's place.

=== COMPARISON TABLE ===
Generate 6 comparison rows: feature name, product advantage, competitor disadvantage.
Features should cover: Price, Doctor/Prescription requirement, Ease of use, Technology, Guarantee, Hidden fees.

=== TESTIMONIALS ===
Generate 3 realistic testimonials. Each should:
- Include a specific detail that makes it feel real (e.g., "I had $7,400 [competitor] and switched")
- Have 4-5 stars
- Include a first name and location
- Be 2-3 sentences max

=== OUTPUT FORMAT ===
Return a JSON object (no markdown fences, just raw JSON) with this exact structure:

{
  "headline": "...",
  "subtitle": "...",
  "metaDescription": "...",
  "categoryTag": "...",
  "authorName": "...",
  "authorTitle": "...",
  "heroImageAlt": "...",
  "heroImageCaption": "...",
  "hook": {
    "opening": "...",
    "paragraph2": "...",
    "paragraph3": "..."
  },
  "breakingPoint": {
    "heading": "...",
    "paragraph1": "...",
    "paragraph2": "...",
    "quote": "...",
    "quoteAttribution": "...",
    "paragraph3": "..."
  },
  "failedSolutions": {
    "heading": "...",
    "intro": "...",
    "solution1": "...",
    "solution2": "...",
    "solution3": "...",
    "keyReframeQuote": "...",
    "conclusion": "..."
  },
  "mechanism": {
    "heading": "...",
    "intro": "...",
    "calloutTitle": "...",
    "explanation": "...",
    "analogy": "...",
    "authorityParagraph": "...",
    "urgencyParagraph": "...",
    "midCtaText": "...",
    "midCtaButtonText": "..."
  },
  "payoff": {
    "heading": "...",
    "paragraph1": "...",
    "paragraph2": "...",
    "paragraph3": "...",
    "emotionalResolution": "..."
  },
  "cta": {
    "heading": "...",
    "stayPath": "...",
    "changePath": "...",
    "buttonText": "...",
    "guaranteeText": "...",
    "urgencyNote": "..."
  },
  "comparisonRows": [
    { "feature": "...", "product": "...", "competitor": "..." }
  ],
  "testimonials": [
    { "stars": 5, "quote": "...", "name": "...", "detail": "..." }
  ]
}

CRITICAL RULES:
- Every paragraph must be 2-4 sentences. Dense, specific, emotional.
- The character must feel like a real person — specific details make fiction feel like journalism.
- The emotional breaking point must involve a loved one showing quiet acceptance, not anger.
- The mechanism section must CHANGE what the reader believes about the cause of their problem.
- The payoff must mirror the breaking point — same people, same situation, different outcome.
- The CTA must frame buying as a LIFE decision, not a product decision.
- NO marketing jargon. NO "revolutionary." NO "game-changer." Write like a journalist, not a marketer.
- The headline should look like an editorial article headline, not an ad headline.
- Total body copy should be 1,500-2,000 words across all sections.`;
}

// ─── HTML Assembler ──────────────────────────────────────────────

function assembleHtml(
  copy: AdvertorialCopy,
  template: AdvertorialTemplate,
  brief: AdvertorialBrief
): string {
  const htmlTemplate = fs.readFileSync(
    path.join(process.cwd(), "templates/advertorial.html"),
    "utf-8"
  );

  const today = new Date();
  const publishDate = today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const year = today.getFullYear();
  const wordCount = Object.values(copy)
    .flat()
    .map((v) => (typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v) : ""))
    .join(" ")
    .split(/\s+/).length;
  const readTime = Math.ceil(wordCount / 250);

  // Build trust bar logos
  const trustLogos = template.trustStack.mediaLogos
    .map((logo) => `<span class="logo-placeholder">${logo}</span>`)
    .join("\n    ");

  // Build comparison rows
  const comparisonRows = copy.comparisonRows
    .map(
      (row) => `      <tr>
        <td>${row.feature}</td>
        <td class="highlight-col"><span class="check">✓</span> ${row.product}</td>
        <td><span class="cross">✗</span> ${row.competitor}</td>
      </tr>`
    )
    .join("\n");

  // Build testimonials
  const testimonialsHtml = copy.testimonials
    .map(
      (t) => `  <div class="testimonial">
    <div class="stars">${"★".repeat(t.stars)}${"☆".repeat(5 - t.stars)}</div>
    <blockquote>"${t.quote}"</blockquote>
    <div class="reviewer">
      <strong>${t.name}</strong> — ${t.detail} &nbsp;
      <span class="verified">✓ Verified Buyer</span>
    </div>
  </div>`
    )
    .join("\n");

  // Build friction killers
  const frictionKillersHtml = template.product.frictionKillers
    .map((f) => `<span>${f}</span>`)
    .join("\n    ");

  // Replace all placeholders
  const replacements: Record<string, string> = {
    "{{HEADLINE}}": copy.headline,
    "{{META_DESCRIPTION}}": copy.metaDescription,
    "{{OG_IMAGE}}": "",
    "{{CATEGORY_TAG}}": copy.categoryTag,
    "{{SUBTITLE}}": copy.subtitle,
    "{{AUTHOR_NAME}}": copy.authorName,
    "{{AUTHOR_TITLE}}": copy.authorTitle,
    "{{PUBLISH_DATE}}": publishDate,
    "{{READ_TIME}}": String(readTime),
    "{{HERO_IMAGE_URL}}": "",
    "{{HERO_IMAGE_ALT}}": copy.heroImageAlt,
    "{{HERO_IMAGE_CAPTION}}": copy.heroImageCaption,
    "{{HOOK_OPENING}}": copy.hook.opening,
    "{{HOOK_PARAGRAPH_2}}": copy.hook.paragraph2,
    "{{HOOK_PARAGRAPH_3}}": copy.hook.paragraph3,
    "{{BREAKING_POINT_HEADING}}": copy.breakingPoint.heading,
    "{{BREAKING_POINT_PARAGRAPH_1}}": copy.breakingPoint.paragraph1,
    "{{BREAKING_POINT_PARAGRAPH_2}}": copy.breakingPoint.paragraph2,
    "{{BREAKING_POINT_QUOTE}}": copy.breakingPoint.quote,
    "{{BREAKING_POINT_QUOTE_ATTRIBUTION}}": copy.breakingPoint.quoteAttribution,
    "{{BREAKING_POINT_PARAGRAPH_3}}": copy.breakingPoint.paragraph3,
    "{{FAILED_SOLUTIONS_HEADING}}": copy.failedSolutions.heading,
    "{{FAILED_SOLUTIONS_INTRO}}": copy.failedSolutions.intro,
    "{{FAILED_SOLUTION_1}}": copy.failedSolutions.solution1,
    "{{FAILED_SOLUTION_2}}": copy.failedSolutions.solution2,
    "{{FAILED_SOLUTION_3}}": copy.failedSolutions.solution3,
    "{{KEY_REFRAME_QUOTE}}": copy.failedSolutions.keyReframeQuote,
    "{{FAILED_SOLUTIONS_CONCLUSION}}": copy.failedSolutions.conclusion,
    "{{MECHANISM_HEADING}}": copy.mechanism.heading,
    "{{MECHANISM_INTRO}}": copy.mechanism.intro,
    "{{MECHANISM_CALLOUT_TITLE}}": copy.mechanism.calloutTitle,
    "{{MECHANISM_EXPLANATION}}": copy.mechanism.explanation,
    "{{MECHANISM_ANALOGY}}": copy.mechanism.analogy,
    "{{MECHANISM_AUTHORITY_PARAGRAPH}}": copy.mechanism.authorityParagraph,
    "{{MECHANISM_URGENCY_PARAGRAPH}}": copy.mechanism.urgencyParagraph,
    "{{MID_CTA_TEXT}}": copy.mechanism.midCtaText,
    "{{MID_CTA_BUTTON_TEXT}}": copy.mechanism.midCtaButtonText,
    "{{CTA_URL}}": brief.ctaUrl,
    "{{PAYOFF_HEADING}}": copy.payoff.heading,
    "{{PAYOFF_PARAGRAPH_1}}": copy.payoff.paragraph1,
    "{{PAYOFF_PARAGRAPH_2}}": copy.payoff.paragraph2,
    "{{PAYOFF_PARAGRAPH_3}}": copy.payoff.paragraph3,
    "{{PAYOFF_EMOTIONAL_RESOLUTION}}": copy.payoff.emotionalResolution,
    "{{TRUST_BAR_LOGOS}}": trustLogos,
    "{{PRODUCT_NAME}}": brief.productName,
    "{{COMPARISON_COMPETITOR}}": "Traditional Alternative",
    "{{COMPARISON_TABLE_ROWS}}": comparisonRows,
    "{{TESTIMONIALS_HTML}}": testimonialsHtml,
    "{{FRICTION_KILLERS_HTML}}": frictionKillersHtml,
    "{{CTA_HEADING}}": copy.cta.heading,
    "{{CTA_STAY_PATH}}": copy.cta.stayPath,
    "{{CTA_CHANGE_PATH}}": copy.cta.changePath,
    "{{ORIGINAL_PRICE}}": template.product.originalPrice,
    "{{SALE_PRICE}}": template.product.price,
    "{{CTA_BUTTON_TEXT}}": copy.cta.buttonText,
    "{{GUARANTEE_TEXT}}": copy.cta.guaranteeText,
    "{{URGENCY_NOTE}}": copy.cta.urgencyNote,
    "{{YEAR}}": String(year),
    "{{ADVERTISER_NAME}}": brief.clientName,
  };

  let html = htmlTemplate;
  for (const [placeholder, value] of Object.entries(replacements)) {
    html = html.replaceAll(placeholder, value);
  }

  return html;
}

// ─── Generator ───────────────────────────────────────────────────

async function generateAdvertorial(brief: AdvertorialBrief): Promise<GeneratedAdvertorial> {
  const template = getAdvertorialTemplate(brief.templateId);
  if (!template) {
    const available = listAdvertorialTemplates()
      .map((t) => `  ${t.id} — ${t.name}`)
      .join("\n");
    throw new Error(
      `Template "${brief.templateId}" not found. Available templates:\n${available}`
    );
  }

  // Merge overrides
  const mergedTemplate: AdvertorialTemplate = brief.overrides
    ? { ...template, ...brief.overrides }
    : template;

  console.log(`\n📝 Generating advertorial for "${brief.productName}"...`);
  console.log(`   Template: ${mergedTemplate.name}`);
  console.log(`   Niche: ${mergedTemplate.niche}`);
  console.log(`   Audience: ${mergedTemplate.audience}\n`);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = buildPrompt(mergedTemplate, brief);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  const rawText =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Parse JSON response
  let copy: AdvertorialCopy;
  try {
    // Strip markdown fences if present
    const jsonStr = rawText
      .replace(/^```(?:json)?\s*\n?/m, "")
      .replace(/\n?```\s*$/m, "")
      .trim();
    copy = JSON.parse(jsonStr);
  } catch (err) {
    console.error("❌ Failed to parse AI response as JSON. Raw output saved to debug-output.txt");
    fs.writeFileSync(
      path.join(process.cwd(), "debug-output.txt"),
      rawText,
      "utf-8"
    );
    throw new Error("AI response was not valid JSON. Check debug-output.txt");
  }

  // Assemble final HTML
  const html = assembleHtml(copy, mergedTemplate, brief);

  // Calculate word count
  const textOnly = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const wordCount = textOnly.split(" ").filter((w) => w.length > 0).length;

  // Save output
  const outputDir = path.join(process.cwd(), "output/advertorials");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const slug = brief.productName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+$/, "");
  const timestamp = new Date().toISOString().split("T")[0];
  const fileName = `${slug}-${timestamp}`;

  const htmlPath = path.join(outputDir, `${fileName}.html`);
  const jsonPath = path.join(outputDir, `${fileName}.json`);

  fs.writeFileSync(htmlPath, html, "utf-8");
  fs.writeFileSync(jsonPath, JSON.stringify(copy, null, 2), "utf-8");

  console.log(`\n✅ Advertorial generated!`);
  console.log(`   HTML: ${htmlPath}`);
  console.log(`   Copy JSON: ${jsonPath}`);
  console.log(`   Word count: ~${wordCount}`);
  console.log(`   Sections: Hook → Breaking Point → Failed Solutions → Mechanism → Payoff → CTA`);

  return { html, copyJson: copy, filePath: htmlPath, wordCount };
}

// ─── CLI ─────────────────────────────────────────────────────────

function printUsage() {
  console.log(`
📝 Advertorial Generator — Seen By Many

Usage:
  npx tsx scripts/generate-advertorial.ts [options]

Options:
  --template <id>     Template to use (required unless --list)
  --product <name>    Product name (required)
  --client <name>     Client/advertiser name (required)
  --cta <url>         CTA destination URL (required)
  --list              List available templates

Examples:
  npx tsx scripts/generate-advertorial.ts --list

  npx tsx scripts/generate-advertorial.ts \\
    --template hearing-aid \\
    --product "ClearSound Pro" \\
    --client "ClearSound Inc" \\
    --cta "https://clearsound.com/order"

  npx tsx scripts/generate-advertorial.ts \\
    --template joint-pain \\
    --product "FlexiJoint Plus" \\
    --client "FlexiHealth LLC" \\
    --cta "https://flexijoint.com/try"

Available templates:`);

  listAdvertorialTemplates().forEach((t) => {
    console.log(`  ${t.id.padEnd(16)} ${t.name} (${t.niche})`);
  });
  console.log();
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--list") || args.length === 0) {
    printUsage();
    return;
  }

  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
  };

  const templateId = getArg("--template");
  const productName = getArg("--product");
  const clientName = getArg("--client");
  const ctaUrl = getArg("--cta");

  if (!templateId || !productName || !clientName || !ctaUrl) {
    console.error("❌ Missing required arguments. Use --list to see usage.\n");
    printUsage();
    process.exit(1);
  }

  const brief: AdvertorialBrief = {
    clientName,
    productName,
    ctaUrl,
    templateId,
  };

  await generateAdvertorial(brief);
}

export { generateAdvertorial, assembleHtml, buildPrompt };

if (require.main === module) {
  main().catch((err) => {
    console.error("❌ Generation failed:", err.message || err);
    process.exit(1);
  });
}
