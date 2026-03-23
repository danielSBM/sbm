"use client";

import { useState, useCallback, useRef } from "react";

// ─── Types ─────────────────────────────────────────────────
interface Video {
  id: string;
  url: string;
  caption: string;
  createDate: string;
  author: { uniqueId: string; nickname: string; followers: number };
  stats: { views: number; likes: number; comments: number; shares: number; saves: number };
  engagement: { rate: number };
  thumbnailUrl: string;
  videoUrl: string;
  hashtags: string[];
  fetchedComments?: Comment[];
}

interface Comment {
  text: string;
  likes: number;
  replies: number;
  isQuestion: boolean;
}

interface HookAnalysis {
  videoId: string;
  hookText: string;
  hookType: string;
  emotionalTrigger: string;
  visualTechnique: string;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  replicationNotes: string;
  analyzedBy: string;
  error?: string;
}

interface Insights {
  topQuestions: string[];
  painPoints: string[];
  desires: string[];
  objections: string[];
  sentimentSummary: string;
  keyThemes: string[];
}

interface SearchResult {
  keyword: string;
  totalVideos: number;
  dateRange: { from: string; to: string };
  videos: Video[];
  topHashtags: { tag: string; count: number }[];
  avgEngagement: { views: number; likes: number; comments: number; shares: number; engagementRate: number };
}

type StepStatus = "idle" | "running" | "done" | "error";

interface StepState {
  status: StepStatus;
  detail: string;
}

// ─── Helpers ───────────────────────────────────────────────
function formatNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function renderMarkdown(md: string) {
  return md
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/^---$/gm, "<hr>")
    .replace(/^- (.*$)/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/gs, "<ul>$&</ul>")
    .replace(/^\d+\. (.*$)/gm, "<li>$1</li>")
    .replace(/^(?!<[hHuUoOlL])(.*\S.*)$/gm, "<p>$1</p>")
    .replace(/\n{2,}/g, "");
}

// ─── Component ─────────────────────────────────────────────
export default function Dashboard() {
  const [keyword, setKeyword] = useState("");
  const [maxVideos, setMaxVideos] = useState(20);
  const [topN, setTopN] = useState(5);
  const [commentsPerVideo, setCommentsPerVideo] = useState(50);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [steps, setSteps] = useState<StepState[]>([
    { status: "idle", detail: "" },
    { status: "idle", detail: "" },
    { status: "idle", detail: "" },
    { status: "idle", detail: "" },
    { status: "idle", detail: "" },
  ]);

  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [topVideos, setTopVideos] = useState<Video[]>([]);
  const [hookAnalyses, setHookAnalyses] = useState<HookAnalysis[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [brief, setBrief] = useState("");
  const [elapsed, setElapsed] = useState("");

  const [tab, setTab] = useState<"agent" | "history">("agent");
  const [historyBriefs, setHistoryBriefs] = useState<Array<{ file: string; keyword?: string; generatedAt?: string; videosAnalyzed?: number }>>([]);

  const abortRef = useRef<AbortController | null>(null);

  const updateStep = useCallback((idx: number, update: Partial<StepState>) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...update } : s)));
  }, []);

  const resetState = useCallback(() => {
    setError("");
    setSearchResult(null);
    setTopVideos([]);
    setHookAnalyses([]);
    setInsights(null);
    setBrief("");
    setElapsed("");
    setSteps([
      { status: "idle", detail: "" },
      { status: "idle", detail: "" },
      { status: "idle", detail: "" },
      { status: "idle", detail: "" },
      { status: "idle", detail: "" },
    ]);
  }, []);

  // ─── Run Pipeline ──────────────────────────────────────
  const runAgent = useCallback(async () => {
    if (!keyword.trim()) return;
    const startTime = Date.now();

    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setRunning(true);
    resetState();

    try {
      // Step 1: Search
      updateStep(0, { status: "running", detail: "Searching TikTok..." });
      const searchRes = await fetch("/api/tiktok/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), maxVideos, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
        signal,
      });
      const searchData = await searchRes.json();
      if (searchData.error) throw new Error(searchData.error);
      setSearchResult(searchData);
      updateStep(0, { status: "done", detail: `${searchData.totalVideos} videos found` });

      if (searchData.videos.length === 0) {
        throw new Error("No videos found. Try a different keyword.");
      }

      const top = searchData.videos
        .sort((a: Video, b: Video) => b.stats.likes - a.stats.likes)
        .slice(0, topN);
      setTopVideos(top);

      // Step 2: Comments (sequential per video)
      updateStep(1, { status: "running", detail: "Scraping comments..." });
      const allComments: Comment[] = [];

      for (let i = 0; i < top.length; i++) {
        updateStep(1, { status: "running", detail: `Video ${i + 1}/${top.length}...` });
        try {
          const commentRes = await fetch("/api/tiktok/comments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoUrl: top[i].url, maxComments: commentsPerVideo }),
            signal,
          });
          const commentData = await commentRes.json();
          if (commentData.comments) {
            top[i].fetchedComments = commentData.comments;
            allComments.push(...commentData.comments);
          }
        } catch (e) {
          if (signal.aborted) throw e;
          // Continue on individual video failure
        }
      }
      setTopVideos([...top]);
      updateStep(1, { status: "done", detail: `${allComments.length} comments from ${top.length} videos` });

      // Step 3: Hook Analysis
      updateStep(2, { status: "running", detail: "Analyzing hooks..." });
      try {
        const hookRes = await fetch("/api/tiktok/hooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videos: top.map((v: Video) => ({ videoId: v.id, videoUrl: v.videoUrl, caption: v.caption })),
          }),
          signal,
        });
        const hookData = await hookRes.json();
        const hooks = (hookData.hooks || []).filter((h: HookAnalysis) => !h.error);
        setHookAnalyses(hooks);
        updateStep(2, { status: "done", detail: `${hooks.length} hooks analyzed` });
      } catch (e) {
        if (signal.aborted) throw e;
        updateStep(2, { status: "error", detail: "Hook analysis failed" });
      }

      // Step 4: Comment Insights
      updateStep(3, { status: "running", detail: "Analyzing comments..." });
      let insightsData: Insights = {
        topQuestions: [], painPoints: [], desires: [], objections: [],
        sentimentSummary: "No comments available.", keyThemes: [],
      };
      if (allComments.length > 0) {
        try {
          const insRes = await fetch("/api/tiktok/insights", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comments: allComments, keyword: keyword.trim() }),
            signal,
          });
          const insData = await insRes.json();
          if (!insData.error) insightsData = insData;
        } catch (e) {
          if (signal.aborted) throw e;
        }
      }
      setInsights(insightsData);
      updateStep(3, {
        status: "done",
        detail: `${insightsData.topQuestions.length} questions, ${insightsData.painPoints.length} pain points`,
      });

      // Step 5: Creative Brief
      updateStep(4, { status: "running", detail: "Generating brief..." });
      const briefRes = await fetch("/api/tiktok/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchResult: searchData,
          topVideos: top,
          hookAnalyses,
          commentInsights: insightsData,
        }),
        signal,
      });
      const briefData = await briefRes.json();
      if (briefData.error) throw new Error(briefData.error);
      setBrief(briefData.brief);
      updateStep(4, { status: "done", detail: "Brief generated" });

      setElapsed(((Date.now() - startTime) / 1000).toFixed(1));
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setRunning(false);
    }
  }, [keyword, maxVideos, topN, commentsPerVideo, dateFrom, dateTo, updateStep, resetState, hookAnalyses]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/tiktok/briefs");
      const data = await res.json();
      setHistoryBriefs(data);
    } catch {}
  }, []);

  const stepLabels = ["Search TikTok", "Scrape Comments", "Analyze Hooks", "AI Comment Analysis", "Creative Brief"];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e2e2ef", fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #2a2a3a", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            TikTok Analysis Agent
          </div>
          <div style={{ fontSize: "0.75rem", color: "#8888a0" }}>Seen By Many</div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["agent", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t === "history") loadHistory(); }}
              style={{
                padding: "0.5rem 1rem", borderRadius: 8, border: `1px solid ${tab === t ? "#6366f1" : "#2a2a3a"}`,
                background: tab === t ? "#1a1a24" : "transparent", color: tab === t ? "#e2e2ef" : "#8888a0",
                cursor: "pointer", fontSize: "0.8rem", textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "2rem" }}>
        {/* ── Agent Tab ── */}
        {tab === "agent" && (
          <>
            {/* Search Panel */}
            <div style={{ background: "#111118", border: "1px solid #2a2a3a", borderRadius: 16, padding: "2rem", marginBottom: "2rem" }}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: "1.5rem" }}>New Analysis</h2>

              {/* Row 1: keyword + dates + videos + run */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "1rem", alignItems: "end", marginBottom: "1rem" }}>
                <FormField label="Keyword">
                  <input
                    type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !running && runAgent()}
                    placeholder='e.g. "ugc skincare ads"'
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Date From">
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
                </FormField>
                <FormField label="Date To">
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
                </FormField>
                <FormField label="Videos">
                  <input type="number" value={maxVideos} onChange={(e) => setMaxVideos(Number(e.target.value))} min={5} max={50} style={inputStyle} />
                </FormField>
                <div>
                  <button
                    onClick={runAgent} disabled={running || !keyword.trim()}
                    style={{
                      width: "100%", padding: "0.7rem 1.5rem", borderRadius: 10, border: "none",
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)", color: "white",
                      fontSize: "0.9rem", fontWeight: 600, cursor: running ? "not-allowed" : "pointer",
                      opacity: running || !keyword.trim() ? 0.5 : 1,
                    }}
                  >
                    {running ? "Running..." : "Run Agent"}
                  </button>
                </div>
              </div>

              {/* Row 2: Advanced */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 3fr", gap: "1rem", alignItems: "end" }}>
                <FormField label="Deep Analyze (top N)">
                  <input type="number" value={topN} onChange={(e) => setTopN(Number(e.target.value))} min={1} max={20} style={inputStyle} />
                </FormField>
                <FormField label="Comments / Video">
                  <input type="number" value={commentsPerVideo} onChange={(e) => setCommentsPerVideo(Number(e.target.value))} min={10} max={200} style={inputStyle} />
                </FormField>
                <div />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", borderRadius: 10, padding: "1rem 1.5rem", color: "#ef4444", marginBottom: "1.5rem" }}>
                {error}
              </div>
            )}

            {/* Pipeline Steps */}
            {steps.some((s) => s.status !== "idle") && (
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
                {steps.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1, background: "#111118", border: "1px solid #2a2a3a", borderRadius: 12,
                      padding: "1rem", position: "relative", overflow: "hidden",
                    }}
                  >
                    <div style={{ fontSize: "0.65rem", color: "#8888a0", textTransform: "uppercase", letterSpacing: "0.1em" }}>Step {i + 1}</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, margin: "0.3rem 0" }}>
                      {s.status === "done" && <span style={{ color: "#22c55e" }}>&#10003; </span>}
                      {s.status === "error" && <span style={{ color: "#ef4444" }}>&#10007; </span>}
                      {stepLabels[i]}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#8888a0" }}>{s.detail || (s.status === "idle" ? "Waiting..." : "")}</div>
                    <div
                      style={{
                        position: "absolute", bottom: 0, left: 0, height: 3,
                        width: s.status === "running" ? "60%" : s.status === "done" ? "100%" : s.status === "error" ? "100%" : "0%",
                        background: s.status === "done" ? "#22c55e" : s.status === "error" ? "#ef4444" : "linear-gradient(135deg, #6366f1, #a855f7)",
                        transition: "width 0.5s",
                        animation: s.status === "running" ? "pulse 1.5s infinite" : "none",
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Stats Row */}
            {elapsed && searchResult && (
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
                {[
                  { value: searchResult.totalVideos, label: "Videos Found" },
                  { value: topVideos.length, label: "Deep Analyzed" },
                  { value: topVideos.reduce((s, v) => s + (v.fetchedComments?.length || 0), 0), label: "Comments" },
                  { value: hookAnalyses.length, label: "Hooks Analyzed" },
                  { value: `${elapsed}s`, label: "Time" },
                ].map((s, i) => (
                  <div key={i} style={{ flex: 1, background: "#111118", border: "1px solid #2a2a3a", borderRadius: 12, padding: "1.2rem", textAlign: "center" }}>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700, background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#8888a0", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.3rem" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Hashtag Pills */}
            {searchResult && searchResult.topHashtags.length > 0 && (
              <div style={{ marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {searchResult.topHashtags.map((h, i) => (
                  <span key={i} style={{ fontSize: "0.7rem", padding: "0.25rem 0.6rem", borderRadius: 20, background: "rgba(99,102,241,0.12)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.2)" }}>
                    #{h.tag} <span style={{ color: "#8888a0" }}>({h.count})</span>
                  </span>
                ))}
              </div>
            )}

            {/* Results Grid */}
            {topVideos.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
                {/* Video Cards */}
                <Card title="Top Videos" full>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
                    {topVideos.map((v) => (
                      <a
                        key={v.id} href={v.url} target="_blank" rel="noopener noreferrer"
                        style={{ textDecoration: "none", color: "inherit", background: "#1a1a24", borderRadius: 10, overflow: "hidden", border: "1px solid #2a2a3a", transition: "border-color 0.2s" }}
                      >
                        {v.thumbnailUrl ? (
                          <img src={v.thumbnailUrl} alt="" style={{ width: "100%", aspectRatio: "9/16", maxHeight: 200, objectFit: "cover", background: "#2a2a3a" }} loading="lazy" />
                        ) : (
                          <div style={{ width: "100%", aspectRatio: "9/16", maxHeight: 200, background: "#2a2a3a", display: "flex", alignItems: "center", justifyContent: "center", color: "#8888a0", fontSize: "0.75rem" }}>
                            No thumbnail
                          </div>
                        )}
                        <div style={{ padding: "0.8rem" }}>
                          <div style={{ fontSize: "0.75rem", color: "#8b5cf6", fontWeight: 600 }}>@{v.author.uniqueId}</div>
                          <div style={{ fontSize: "0.75rem", color: "#8888a0", margin: "0.3rem 0", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                            {v.caption}
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.7rem", color: "#8888a0", alignItems: "center" }}>
                            <span>{formatNum(v.stats.views)} views</span>
                            <span>{formatNum(v.stats.likes)} likes</span>
                            <span style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem", borderRadius: 4, background: "rgba(99,102,241,0.15)", color: "#6366f1", fontWeight: 600 }}>
                              {v.engagement.rate.toFixed(1)}% ER
                            </span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </Card>

                {/* Hooks */}
                {hookAnalyses.length > 0 && (
                  <Card title="Hook Analysis">
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                      {hookAnalyses.map((h, i) => {
                        const scoreClass = h.overallScore >= 7 ? "#22c55e" : h.overallScore >= 5 ? "#f59e0b" : "#ef4444";
                        const scoreBg = h.overallScore >= 7 ? "rgba(34,197,94,0.15)" : h.overallScore >= 5 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)";
                        return (
                          <div key={i} style={{ background: "#1a1a24", borderRadius: 10, padding: "1rem", borderLeft: "3px solid #6366f1" }}>
                            <div style={{ fontStyle: "italic", marginBottom: "0.5rem", fontSize: "0.9rem" }}>"{h.hookText}"</div>
                            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.5rem", borderRadius: 5, background: scoreBg, color: scoreClass }}>
                                {h.overallScore}/10
                              </span>
                              <Tag>{h.hookType}</Tag>
                              <Tag>{h.emotionalTrigger}</Tag>
                              <Tag>{h.visualTechnique}</Tag>
                              <Tag>{h.analyzedBy}</Tag>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}

                {/* Insights */}
                {insights && insights.topQuestions.length > 0 && (
                  <Card title="Audience Insights">
                    <InsightGroup title="Top Questions" items={insights.topQuestions} />
                    <InsightGroup title="Pain Points" items={insights.painPoints} />
                    <InsightGroup title="Desires" items={insights.desires} />
                    <InsightGroup title="Objections" items={insights.objections} />
                    {insights.sentimentSummary && (
                      <p style={{ fontSize: "0.8rem", color: "#8888a0", marginTop: "1rem" }}>{insights.sentimentSummary}</p>
                    )}
                  </Card>
                )}

                {/* Engagement Breakdown */}
                {searchResult && (
                  <Card title="Avg Engagement">
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                      {[
                        { label: "Views", value: searchResult.avgEngagement.views, max: searchResult.avgEngagement.views, color: "#6366f1" },
                        { label: "Likes", value: searchResult.avgEngagement.likes, max: searchResult.avgEngagement.views, color: "#8b5cf6" },
                        { label: "Comments", value: searchResult.avgEngagement.comments, max: searchResult.avgEngagement.views, color: "#a855f7" },
                        { label: "Shares", value: searchResult.avgEngagement.shares, max: searchResult.avgEngagement.views, color: "#22c55e" },
                      ].map((m, i) => (
                        <div key={i}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.3rem" }}>
                            <span style={{ color: "#8888a0" }}>{m.label}</span>
                            <span style={{ fontWeight: 600 }}>{formatNum(m.value)}</span>
                          </div>
                          <div style={{ height: 6, background: "#1a1a24", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min((m.value / Math.max(m.max, 1)) * 100, 100)}%`, background: m.color, borderRadius: 3, transition: "width 0.5s" }} />
                          </div>
                        </div>
                      ))}
                      <div style={{ textAlign: "center", marginTop: "0.5rem", padding: "0.8rem", background: "#1a1a24", borderRadius: 10 }}>
                        <div style={{ fontSize: "2rem", fontWeight: 700, background: "linear-gradient(135deg, #6366f1, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                          {searchResult.avgEngagement.engagementRate}%
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#8888a0", textTransform: "uppercase" }}>Avg Engagement Rate</div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Brief */}
                {brief && (
                  <Card title="Creative Brief" full>
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                      <ActionBtn
                        onClick={() => {
                          navigator.clipboard.writeText(brief);
                        }}
                      >
                        Copy Markdown
                      </ActionBtn>
                      <ActionBtn
                        onClick={() => {
                          const blob = new Blob([brief], { type: "text/markdown" });
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(blob);
                          a.download = `${keyword.trim().replace(/\s+/g, "-").toLowerCase()}-brief.md`;
                          a.click();
                        }}
                      >
                        Download .md
                      </ActionBtn>
                    </div>
                    <div
                      style={{
                        background: "#1a1a24", borderRadius: 10, padding: "2rem", fontSize: "0.9rem",
                        lineHeight: 1.7, maxHeight: "80vh", overflowY: "auto",
                      }}
                      className="brief-content"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(brief) }}
                    />
                  </Card>
                )}
              </div>
            )}
          </>
        )}

        {/* ── History Tab ── */}
        {tab === "history" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {historyBriefs.length === 0 ? (
              <p style={{ color: "#8888a0", textAlign: "center", padding: "3rem" }}>No briefs yet. Run your first analysis!</p>
            ) : (
              historyBriefs.map((b) => (
                <div
                  key={b.file}
                  onClick={async () => {
                    const res = await fetch(`/api/tiktok/briefs?file=${b.file}`);
                    const md = await res.text();
                    setBrief(md);
                    setTab("agent");
                  }}
                  style={{
                    background: "#111118", border: "1px solid #2a2a3a", borderRadius: 10,
                    padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between",
                    alignItems: "center", cursor: "pointer", transition: "border-color 0.2s",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{b.keyword || b.file}</div>
                    <div style={{ fontSize: "0.8rem", color: "#8888a0" }}>
                      {b.generatedAt ? new Date(b.generatedAt).toLocaleDateString() : ""} &middot; {b.videosAnalyzed || "?"} videos
                    </div>
                  </div>
                  <span style={{ color: "#8888a0" }}>&rarr;</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Global animation */}
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .brief-content h1 { font-size: 1.5rem; margin: 1.5rem 0 0.5rem; background: linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .brief-content h2 { font-size: 1.2rem; margin: 1.5rem 0 0.5rem; color: #6366f1; }
        .brief-content h3 { font-size: 1rem; margin: 1rem 0 0.5rem; color: #8b5cf6; }
        .brief-content p { margin: 0.5rem 0; color: #8888a0; }
        .brief-content ul, .brief-content ol { margin: 0.5rem 0 0.5rem 1.5rem; color: #8888a0; }
        .brief-content li { margin: 0.3rem 0; }
        .brief-content strong { color: #e2e2ef; }
        .brief-content code { background: #111118; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.85rem; }
        .brief-content hr { border: none; border-top: 1px solid #2a2a3a; margin: 1.5rem 0; }
      `}</style>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.7rem 1rem", borderRadius: 10,
  border: "1px solid #2a2a3a", background: "#1a1a24", color: "#e2e2ef",
  fontSize: "0.9rem", outline: "none",
};

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.75rem", color: "#8888a0", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Card({ title, full, children }: { title: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ background: "#111118", border: "1px solid #2a2a3a", borderRadius: 14, padding: "1.5rem", gridColumn: full ? "1 / -1" : undefined }}>
      <h3 style={{ fontSize: "0.85rem", color: "#8888a0", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>{title}</h3>
      {children}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: "0.65rem", padding: "0.2rem 0.5rem", borderRadius: 5, background: "#111118", color: "#8888a0", border: "1px solid #2a2a3a" }}>
      {children}
    </span>
  );
}

function InsightGroup({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: "1rem" }}>
      <h4 style={{ fontSize: "0.75rem", color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
        {title}
      </h4>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: "0.85rem", padding: "0.4rem 0", borderBottom: i < items.length - 1 ? "1px solid #2a2a3a" : "none", color: "#8888a0" }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActionBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid #2a2a3a",
        background: "#1a1a24", color: "#8888a0", fontSize: "0.8rem", cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
