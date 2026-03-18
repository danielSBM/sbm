import fs from "fs";
import path from "path";

interface TopicIdea {
  id: number;
  title: string;
  primaryKeyword: string;
  category: string;
  angle: string;
  searchIntent: string;
  estimatedDifficulty: string;
  customerGenerationReason: string;
}

async function sendSlackBrief() {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("❌ SLACK_WEBHOOK_URL not set. Skipping Slack notification.");
    return;
  }

  // Read pending topics
  const topicsPath = path.join(process.cwd(), "content/pending-topics.json");
  if (!fs.existsSync(topicsPath)) {
    console.error("❌ No pending topics found. Run research first.");
    return;
  }

  const data = JSON.parse(fs.readFileSync(topicsPath, "utf-8"));
  const ideas: TopicIdea[] = data.ideas;
  const date = new Date(data.date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Build the Slack message
  const topicBlocks = ideas.map((idea) => {
    const diffEmoji =
      idea.estimatedDifficulty === "low"
        ? "🟢"
        : idea.estimatedDifficulty === "medium"
          ? "🟡"
          : "🔴";

    return `*${idea.id}. ${idea.title}*
${diffEmoji} Difficulty: ${idea.estimatedDifficulty} | Intent: ${idea.searchIntent}
📂 ${idea.category} | 🔑 _${idea.primaryKeyword}_
💡 *Why this generates customers:* ${idea.customerGenerationReason}`;
  });

  const repoUrl = process.env.GITHUB_REPO_URL || "https://github.com/YOUR_REPO";

  const message = {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📰 SEO Blog Brief — ${date}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Good morning! Here are today's *${ideas.length} topic ideas* for the blog. Pick *3-4* to publish today.\n\nReply with the numbers you want (e.g., "1, 3, 5, 7") or trigger the workflow manually.`,
        },
      },
      { type: "divider" },
      ...topicBlocks.map((text) => ({
        type: "section",
        text: { type: "mrkdwn", text },
      })),
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*How to publish:*\n1. Reply here with the topic numbers (e.g., "1, 3, 5")\n2. Then go to <${repoUrl}/actions/workflows/generate-posts.yml|GitHub Actions> → "Run workflow" → enter the same numbers\n\n_Or just reply here and I'll note your picks for when you trigger the build._`,
        },
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status}`);
    }

    console.log("✅ Morning brief sent to Slack!");
  } catch (error) {
    console.error("❌ Failed to send Slack notification:", error);

    // Fallback: print the brief to console
    console.log("\n📰 MORNING BRIEF (Slack failed, showing here):\n");
    ideas.forEach((idea) => {
      console.log(`  ${idea.id}. ${idea.title}`);
      console.log(`     ${idea.category} | ${idea.estimatedDifficulty} difficulty`);
      console.log(`     Why: ${idea.customerGenerationReason}\n`);
    });
  }
}

export { sendSlackBrief };

if (require.main === module) {
  sendSlackBrief().catch((err) => {
    console.error("❌ Notification failed:", err);
    process.exit(1);
  });
}
