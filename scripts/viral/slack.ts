/** Posts Slack Block Kit blocks; falls back to printing when no webhook is set. */
export async function postToSlack(blocks: unknown[], fallbackText: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log("ℹ️  SLACK_WEBHOOK_URL not set — printing instead:\n");
    console.log(fallbackText);
    return;
  }

  // Slack caps a message at 50 blocks
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: fallbackText.slice(0, 3000), blocks: blocks.slice(0, 50) }),
  });

  if (!res.ok) {
    console.error(`❌ Slack webhook failed: ${res.status}`);
    console.log(fallbackText);
  } else {
    console.log("✅ Sent to Slack");
  }
}

export const section = (text: string) => ({
  type: "section",
  text: { type: "mrkdwn", text: text.slice(0, 2900) },
});

export const header = (text: string) => ({
  type: "header",
  text: { type: "plain_text", text: text.slice(0, 150), emoji: true },
});

export const divider = { type: "divider" };
