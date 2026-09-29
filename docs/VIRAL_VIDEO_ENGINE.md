# 🎬 Viral Video Engine

Finds what's going viral on **X** and **YouTube** (via Apify), has **Claude** turn the winners into original
short-form scripts in the Seen By Many voice, and renders them with your **HeyGen avatars**. It runs daily on GitHub Actions
and sends a Slack brief, the same way as the blog pipeline.

```
Apify (X + YouTube) ──► outlier scoring ──► Claude writes scripts ──► Slack brief
                                                                        │ you pick ids (or autopilot)
                                                                        ▼
                                  Slack links + MP4 artifact ◄── HeyGen avatar render
```

## Setup (about 10 minutes)

1. **Keys.** Add these repo secrets (Settings → Secrets and variables → Actions):
   - `APIFY_TOKEN`: from apify.com → Settings → Integrations. The actors used are
     [`apidojo/tweet-scraper`](https://apify.com/apidojo/tweet-scraper) and [`streamers/youtube-scraper`](https://apify.com/streamers/youtube-scraper).
   - `HEYGEN_API_KEY`: from HeyGen → Settings → API.
   - `ANTHROPIC_API_KEY` and `SLACK_WEBHOOK_URL` are already set up for the blog.
2. **Find your avatar and voice IDs** locally:
   ```bash
   HEYGEN_API_KEY=... npm run heygen:list          # or: npm run heygen:list -- daniel
   ```
3. **Configure avatars.** Either
   - set repo **variables** `HEYGEN_AVATAR_ID`, `HEYGEN_VOICE_ID` (and `HEYGEN_AVATAR_TYPE=talking_photo` for a photo avatar), or
   - list several avatars in `config/viral.config.ts` → `avatars`. Each has a `persona`, and Claude picks the best presenter for each script.
4. **Tune** `config/viral.config.ts`: search topics, like/view thresholds, lookback window, script length, and video size (720×1280 by default; use 1080×1920 if your plan allows it).

## Daily flow

| When | What happens |
|------|--------------|
| 8 AM UTC (cron) | `scout` scrapes ~4 rotating topics, scores posts as outliers (engagement ÷ audience + velocity), and Claude writes 8 scripts. They go to Slack and `content/video-ideas/pending.json`. |
| You | Actions → **Viral Video Engine** → Run workflow → mode `produce`, ids `1,3` |
| ~5–15 min later | Slack gets the MP4 links, caption and hashtags. The MP4s are also attached to the workflow run as an artifact. |

**Full autopilot:** set the repo variable `VIRAL_AUTOPILOT=true`, and the daily run also renders the top `VIDEOS_PER_DAY` (default 2) ideas.

## Local commands

```bash
npm run viral:scout                         # scrape + write scripts
npm run viral:produce -- 1,3 --download     # render ideas 1 & 3, save MP4 + caption to output/videos/
npm run viral:produce -- --auto             # render top VIDEOS_PER_DAY ideas
```

## Notes

- Source posts that were already used are recorded in `content/video-ideas/history.json`, so they won't come back as new ideas.
- HeyGen video URLs expire after about 7 days. Download them or push them to your scheduler soon after rendering.
- Rough cost per daily run: Apify ≈ $0.10–0.30, Claude ≈ $0.05, HeyGen = your plan's credits per minute of video.
- Next step for auto-posting: send `videoUrl` + `caption` from `history.json` to a scheduler (Zapier/Make → Buffer, Blotato,
  or Metricool), or use the TikTok/YouTube/Instagram APIs directly.
