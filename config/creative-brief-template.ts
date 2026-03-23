export const creativeBriefTemplate = {
  sections: [
    {
      name: "Executive Summary",
      description:
        "High-level overview of the research findings and recommended creative direction.",
    },
    {
      name: "Market Landscape",
      description:
        "What's trending in this niche on TikTok — top themes, hashtags, content formats, and engagement patterns.",
    },
    {
      name: "Top Performing Content",
      description:
        "Breakdown of the highest-performing videos — what they did right, engagement metrics, and why they worked.",
    },
    {
      name: "Hook Analysis",
      description:
        "Deep dive into the hooks that drive retention — types, patterns, emotional triggers, and visual techniques.",
    },
    {
      name: "Audience Insights",
      description:
        "What the audience is saying — common questions, pain points, desires, and objections from comments.",
    },
    {
      name: "Creative Recommendations",
      description:
        "3-5 specific ad creative concepts with hooks, scripts, and visual direction based on the research.",
    },
    {
      name: "Production Notes",
      description:
        "Recommended format, pacing, length, CTA strategy, and technical specs for the ad creatives.",
    },
  ],

  outputFormat: `
# 🎬 TikTok Creative Brief: {{KEYWORD}}
**Generated:** {{DATE}} | **Videos Analyzed:** {{VIDEO_COUNT}} | **Comments Scraped:** {{COMMENT_COUNT}}

---

## 1. Executive Summary
{{EXECUTIVE_SUMMARY}}

---

## 2. Market Landscape

### Trending Hashtags
{{TOP_HASHTAGS}}

### Average Engagement Metrics
{{AVG_ENGAGEMENT}}

### Content Themes
{{CONTENT_THEMES}}

---

## 3. Top Performing Content

{{TOP_VIDEOS}}

---

## 4. Hook Analysis

### Hook Types Distribution
{{HOOK_TYPES}}

### Most Effective Hooks
{{BEST_HOOKS}}

### Hook Patterns to Replicate
{{HOOK_PATTERNS}}

---

## 5. Audience Insights

### Top Questions from Comments
{{TOP_QUESTIONS}}

### Common Pain Points
{{PAIN_POINTS}}

### Desires & Aspirations
{{DESIRES}}

### Objections & Concerns
{{OBJECTIONS}}

---

## 6. Creative Recommendations

{{CREATIVE_CONCEPTS}}

---

## 7. Production Notes

### Recommended Specs
{{PRODUCTION_SPECS}}

### CTA Strategy
{{CTA_STRATEGY}}

### Brand Alignment Notes
{{BRAND_NOTES}}
`.trim(),
};
