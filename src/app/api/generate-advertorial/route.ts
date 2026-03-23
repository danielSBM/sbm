import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 300;

interface Avatar {
  id: string;
  name: string;
  age: number;
  profession: string;
  lifeSituation: string;
  triggerMoment: string;
  emotionalWound: string;
  failedAttempts: string[];
  heartbreakMoment: string;
  buyingMotivation: string;
  characterDetails: {
    firstName: string;
    definingDetail: string;
    lovedOne: string;
    lovedOneRelationship: string;
  };
  advertorialAngle: string;
}

export async function POST(req: NextRequest) {
  try {
    const { avatar, analysis, pageVariant } = await req.json();

    if (!avatar || !analysis) {
      return NextResponse.json(
        { error: "Avatar and analysis data are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });
    const av = avatar as Avatar;

    const variantInstruction =
      pageVariant === "B"
        ? `

VARIANT B INSTRUCTIONS:
This is the SECOND advertorial for the same avatar. It must be completely different from Variant A:
- Use a DIFFERENT character (different name, different profession, different life context)
- Use a DIFFERENT emotional entry point (if A used a grandchild moment, B uses a spouse moment)
- Use a DIFFERENT mechanism analogy (if A used "Portrait Mode", B uses a completely different comparison)
- Use a DIFFERENT headline style (if A was editorial, B should be more curiosity-driven)
- The core product and benefits stay the same — everything else changes
- This variant should feel like it was written by a different copywriter for a different publication`
        : "";

    const prompt = `You are a world-class direct response copywriter whose advertorials convert at 2-4x industry average. You understand that emotion comes first, logic comes second. Always.

You are writing a complete, publish-ready HTML advertorial page. The advertorial must feel like editorial content — a feature article in a respected publication. NOT an ad.

=== BRAND & PRODUCT ANALYSIS ===
${JSON.stringify(analysis, null, 2)}

=== TARGET AVATAR ===
Name: ${av.name}
Age: ${av.age}
Profession: ${av.profession}
Life Situation: ${av.lifeSituation}
Trigger Moment: ${av.triggerMoment}
Emotional Wound: ${av.emotionalWound}
Failed Attempts: ${av.failedAttempts.join(", ")}
Heartbreak Moment: ${av.heartbreakMoment}
Buying Motivation: ${av.buyingMotivation}
Character Name: ${av.characterDetails.firstName}
Defining Detail: ${av.characterDetails.definingDetail}
Loved One: ${av.characterDetails.lovedOne} (${av.characterDetails.lovedOneRelationship})
Headline Angle: ${av.advertorialAngle}
${variantInstruction}

=== ADVERTORIAL ARCHITECTURE (follow EXACTLY) ===

**SECTION 1 — THE HOOK (3 paragraphs, ~250 words)**
Open with ${av.characterDetails.firstName}. Use their defining detail (${av.characterDetails.definingDetail}) to make them feel real. Show who they WERE before the problem. Then show the problem creeping in — not the clinical symptom, but the emotional toll. They're becoming a secondary character in their own life.

Third paragraph: mirror the reader's inner experience. Name specific behaviors the reader does but has never said out loud.

**SECTION 2 — THE EMOTIONAL BREAKING POINT (~200 words)**
Introduce ${av.characterDetails.lovedOne} (${av.characterDetails.lovedOneRelationship}). Create the heartbreak moment: "${av.heartbreakMoment}"

The loved one doesn't get angry. They show quiet acceptance or pity. That's worse. This must be the most emotionally intense section.

**SECTION 3 — THE FAILED SOLUTIONS (~250 words)**
Walk through what ${av.characterDetails.firstName} tried: ${av.failedAttempts.join("; ")}. For each, explain WHY it fails mechanistically. Build to a reframe quote.

**SECTION 4 — THE MECHANISM / BELIEF SHIFT (~300 words)**
Introduce a new explanation for WHY the problem exists. Use an everyday analogy. Reference a real study or institution for borrowed authority. The one-two punch: new mechanism + terrifying consequence of inaction.

**SECTION 5 — THE PAYOFF (~250 words)**
${av.characterDetails.firstName} discovers the product. Describe the first moment of relief with sensory detail. Then mirror the heartbreak moment from Section 2 — same people, same situation, but now it resolves beautifully. Emotional bookend.

**CTA — FORK IN THE ROAD**
Frame it as a life decision, not a product decision. Price drop. Guarantee. Friction killers.

=== OUTPUT FORMAT ===

Return a COMPLETE, standalone HTML page. Include all CSS inline in a <style> tag. The page must be production-ready — someone can open it in a browser and it looks like a real editorial article.

Design requirements:
- Clean, editorial design (think: New York Times health section or WebMD feature)
- Georgia/serif font for body copy, Inter/sans-serif for UI elements
- Max-width 720px centered article container
- Drop cap on the first paragraph
- Pull quotes with left border accent
- A science/mechanism callout box with light blue background
- "As Featured In" trust bar with media logo names
- Comparison table (product vs traditional alternative) — 6 rows
- 3 realistic testimonial cards with star ratings
- Friction killers row with checkmarks
- Dark gradient CTA section with price anchor and guarantee
- Proper "ADVERTORIAL" disclosure at top and bottom
- Mobile responsive
- Total body copy: 1,500–2,000 words

The HTML must be COMPLETE — start with <!DOCTYPE html> and end with </html>. Include ALL content inline. No external dependencies except Google Fonts.

CRITICAL RULES:
- Every paragraph: 2-4 sentences. Dense, specific, emotional.
- The character must feel like a real person — specific details make fiction feel like journalism.
- The emotional breaking point must involve ${av.characterDetails.lovedOne} showing quiet acceptance, not anger.
- The mechanism must CHANGE what the reader believes about the cause of their problem.
- The payoff must MIRROR the breaking point — same people, same situation, different outcome.
- NO marketing jargon. NO "revolutionary." NO "game-changer." Write like a journalist.
- The headline must look editorial, not like an ad.
- Generate 3 realistic testimonials with specific details.
- Include a comparison table with 6 feature rows.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
      messages: [{ role: "user", content: prompt }],
    });

    const rawHtml =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract HTML — handle cases where AI wraps in markdown
    let html = rawHtml;
    if (html.includes("```html")) {
      html = html.replace(/^[\s\S]*?```html\s*\n?/, "").replace(/\n?```[\s\S]*$/, "");
    } else if (html.includes("```")) {
      html = html.replace(/^[\s\S]*?```\s*\n?/, "").replace(/\n?```[\s\S]*$/, "");
    }

    // Validate it's actual HTML
    if (!html.includes("<!DOCTYPE") && !html.includes("<html")) {
      return NextResponse.json(
        { error: "AI did not return valid HTML" },
        { status: 500 }
      );
    }

    const wordCount = html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ").length;

    return NextResponse.json({
      html,
      avatarId: av.id,
      avatarName: av.name,
      variant: pageVariant || "A",
      wordCount,
    });
  } catch (error) {
    console.error("Advertorial generation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
