"use client";

import { useState } from "react";

interface BrandInputProps {
  onSubmit: (data: { websiteUrl: string; brandAnalysis: string }) => void;
  isLoading: boolean;
}

export default function BrandInput({ onSubmit, isLoading }: BrandInputProps) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [brandAnalysis, setBrandAnalysis] = useState("");

  const canSubmit = brandAnalysis.trim().length >= 50 && !isLoading;

  return (
    <div className="max-w-3xl mx-auto px-6">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-3">Brand Input</h1>
        <p className="text-white/50 text-lg">
          Enter the brand details. Paste your prepared brand analysis below.
        </p>
      </div>

      {/* Form */}
      <div className="space-y-8">
        {/* Website URL */}
        <div>
          <label className="block text-sm font-semibold text-white/70 mb-2 uppercase tracking-wider">
            Website URL
          </label>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all text-lg"
          />
          <p className="text-white/30 text-xs mt-2">
            Optional — helps the AI understand the brand context
          </p>
        </div>

        {/* Brand Analysis */}
        <div>
          <label className="block text-sm font-semibold text-white/70 mb-2 uppercase tracking-wider">
            Brand Analysis
          </label>
          <textarea
            value={brandAnalysis}
            onChange={(e) => setBrandAnalysis(e.target.value)}
            placeholder="Paste your prepared brand analysis here...

Include details about:
• The brand, its products, and pricing
• Target audience and demographics
• Core problem the product solves
• Competitive landscape
• Unique selling propositions
• Existing proof points (studies, reviews, media mentions)
• Any specific angles or messaging that has worked before

The more detailed your analysis, the better the output."
            rows={18}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all text-base leading-relaxed resize-y font-mono"
          />
          <div className="flex justify-between mt-2">
            <p className="text-white/30 text-xs">
              Paste your complete brand analysis — competitive research, product details, audience insights
            </p>
            <p className={`text-xs ${brandAnalysis.length < 50 ? "text-white/30" : "text-emerald-400/70"}`}>
              {brandAnalysis.length} chars
            </p>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={() => onSubmit({ websiteUrl, brandAnalysis })}
          disabled={!canSubmit}
          className={`
            w-full py-4 rounded-xl font-bold text-lg transition-all
            ${
              canSubmit
                ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-400 hover:to-violet-500 shadow-lg shadow-indigo-500/25 cursor-pointer"
                : "bg-white/5 text-white/30 cursor-not-allowed"
            }
          `}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing with Claude + Gemini...
            </span>
          ) : (
            "Analyze Brand"
          )}
        </button>
      </div>
    </div>
  );
}
