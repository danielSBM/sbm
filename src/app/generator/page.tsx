"use client";

import { useState, useCallback } from "react";
import StepIndicator from "./components/StepIndicator";
import BrandInput from "./components/BrandInput";
import AnalysisAvatars from "./components/AnalysisAvatars";
import AdvertorialResults from "./components/AdvertorialResults";

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
  expectedResonance?: string;
}

interface GeneratedPage {
  html: string;
  avatarId: string;
  avatarName: string;
  variant: string;
  wordCount: number;
}

export default function GeneratorPage() {
  // Wizard state
  const [step, setStep] = useState(1);

  // Step 1 state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Step 2 state
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [sources, setSources] = useState<{ claude: boolean; gemini: boolean } | null>(null);
  const [avatars, setAvatars] = useState<Avatar[] | null>(null);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);

  // Step 3 state
  const [selectedAvatars, setSelectedAvatars] = useState<Avatar[]>([]);
  const [generatedPages, setGeneratedPages] = useState<GeneratedPage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({
    current: 0,
    total: 0,
    currentLabel: "",
  });

  // ─── Step 1: Analyze Brand ─────────────────────────
  const handleBrandSubmit = useCallback(
    async (data: { websiteUrl: string; brandAnalysis: string }) => {
      setIsAnalyzing(true);
      setAnalysisError(null);

      try {
        const res = await fetch("/api/analyze-brand/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await res.json();

        if (!res.ok) {
          throw new Error(result.error || "Analysis failed");
        }

        setAnalysis(result.analysis);
        setSources(result.sources);
        setStep(2);
      } catch (err) {
        setAnalysisError(
          err instanceof Error ? err.message : "Analysis failed"
        );
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  // ─── Step 2: Generate Avatars ──────────────────────
  const handleGenerateAvatars = useCallback(async () => {
    if (!analysis) return;
    setIsLoadingAvatars(true);

    try {
      const res = await fetch("/api/generate-avatars/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Avatar generation failed");
      }

      setAvatars(result.avatars);
    } catch (err) {
      console.error("Avatar generation failed:", err);
    } finally {
      setIsLoadingAvatars(false);
    }
  }, [analysis]);

  // ─── Step 2 → 3: Select Avatars & Generate ────────
  const handleSelectAvatars = useCallback(
    async (selected: Avatar[]) => {
      setSelectedAvatars(selected);
      setStep(3);
      setIsGenerating(true);

      const total = selected.length * 2; // 2 variants per avatar
      setGenerationProgress({ current: 0, total, currentLabel: "" });

      const pages: GeneratedPage[] = [];
      let count = 0;

      for (const avatar of selected) {
        for (const variant of ["A", "B"]) {
          count++;
          setGenerationProgress({
            current: count,
            total,
            currentLabel: `${avatar.name} — Variant ${variant}`,
          });

          try {
            const res = await fetch("/api/generate-advertorial/", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                avatar,
                analysis,
                pageVariant: variant,
              }),
            });

            const result = await res.json();

            if (res.ok && result.html) {
              pages.push(result);
              setGeneratedPages([...pages]);
            }
          } catch (err) {
            console.error(
              `Failed: ${avatar.name} Variant ${variant}:`,
              err
            );
          }
        }
      }

      setIsGenerating(false);
    },
    [analysis]
  );

  return (
    <div className="pb-20">
      <StepIndicator currentStep={step} />

      {/* Error Banner */}
      {analysisError && (
        <div className="max-w-3xl mx-auto px-6 mb-6">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-6 py-4 text-sm">
            {analysisError}
          </div>
        </div>
      )}

      {/* Steps */}
      {step === 1 && (
        <BrandInput onSubmit={handleBrandSubmit} isLoading={isAnalyzing} />
      )}

      {step === 2 && analysis && (
        <AnalysisAvatars
          analysis={analysis}
          avatars={avatars}
          isLoadingAvatars={isLoadingAvatars}
          onGenerateAvatars={handleGenerateAvatars}
          onSelectAvatars={handleSelectAvatars}
          sources={sources}
        />
      )}

      {step === 3 && (
        <AdvertorialResults
          selectedAvatars={selectedAvatars}
          pages={generatedPages}
          isGenerating={isGenerating}
          generationProgress={generationProgress}
        />
      )}
    </div>
  );
}
