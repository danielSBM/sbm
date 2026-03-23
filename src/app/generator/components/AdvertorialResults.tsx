"use client";

import { useState } from "react";

interface GeneratedPage {
  html: string;
  avatarId: string;
  avatarName: string;
  variant: string;
  wordCount: number;
}

interface Avatar {
  id: string;
  name: string;
  advertorialAngle: string;
}

interface AdvertorialResultsProps {
  selectedAvatars: Avatar[];
  pages: GeneratedPage[];
  isGenerating: boolean;
  generationProgress: { current: number; total: number; currentLabel: string };
}

export default function AdvertorialResults({
  selectedAvatars,
  pages,
  isGenerating,
  generationProgress,
}: AdvertorialResultsProps) {
  const [previewPage, setPreviewPage] = useState<GeneratedPage | null>(null);

  const downloadHtml = (page: GeneratedPage) => {
    const blob = new Blob([page.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${page.avatarName.toLowerCase().replace(/\s+/g, "-")}-variant-${page.variant}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    pages.forEach((page, i) => {
      setTimeout(() => downloadHtml(page), i * 200);
    });
  };

  // Preview modal
  if (previewPage) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
        {/* Preview Header */}
        <div className="bg-[#111] border-b border-white/10 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <span className="text-white font-semibold">{previewPage.avatarName}</span>
            <span className="text-white/40 mx-2">—</span>
            <span className="text-white/50 text-sm">Variant {previewPage.variant}</span>
            <span className="text-white/30 text-sm ml-3">({previewPage.wordCount} words)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => downloadHtml(previewPage)}
              className="bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-500/30 transition-colors"
            >
              Download HTML
            </button>
            <button
              onClick={() => setPreviewPage(null)}
              className="bg-white/10 text-white/70 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/20 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
        {/* Preview iframe */}
        <div className="flex-1 bg-white">
          <iframe
            srcDoc={previewPage.html}
            className="w-full h-full border-none"
            title={`Preview: ${previewPage.avatarName} Variant ${previewPage.variant}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-3">Generated Advertorials</h1>
        <p className="text-white/50 text-lg">
          {isGenerating
            ? `Generating page ${generationProgress.current} of ${generationProgress.total}...`
            : `${pages.length} advertorial pages ready`}
        </p>
      </div>

      {/* Progress */}
      {isGenerating && (
        <div className="max-w-xl mx-auto mb-12">
          <div className="bg-white/5 rounded-full h-3 overflow-hidden mb-4">
            <div
              className="bg-gradient-to-r from-indigo-500 to-violet-600 h-full rounded-full transition-all duration-500"
              style={{
                width: `${(generationProgress.current / generationProgress.total) * 100}%`,
              }}
            />
          </div>
          <div className="text-center">
            <p className="text-white/50 text-sm">{generationProgress.currentLabel}</p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <svg className="animate-spin h-5 w-5 text-indigo-400" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-indigo-400 text-sm font-medium">
                Writing copy with Claude Sonnet 4...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Results Grid */}
      {pages.length > 0 && (
        <>
          {/* Download All */}
          {!isGenerating && pages.length > 1 && (
            <div className="text-center mb-8">
              <button
                onClick={downloadAll}
                className="bg-emerald-500/20 text-emerald-400 px-6 py-3 rounded-xl text-sm font-bold hover:bg-emerald-500/30 transition-colors"
              >
                Download All {pages.length} Pages
              </button>
            </div>
          )}

          {/* Avatar Groups */}
          {selectedAvatars.map((avatar) => {
            const avatarPages = pages.filter((p) => p.avatarId === avatar.id);
            if (avatarPages.length === 0) return null;

            return (
              <div key={avatar.id} className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-bold">
                    {avatar.name.charAt(4) || "A"}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{avatar.name}</h3>
                    <p className="text-white/40 text-xs">{avatar.advertorialAngle}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {avatarPages.map((page) => (
                    <div
                      key={`${page.avatarId}-${page.variant}`}
                      className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all group"
                    >
                      {/* Mini Preview */}
                      <div className="relative h-52 bg-white overflow-hidden">
                        <iframe
                          srcDoc={page.html}
                          className="w-[200%] h-[200%] border-none origin-top-left scale-50 pointer-events-none"
                          title={`${page.avatarName} Variant ${page.variant}`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
                        <div className="absolute top-3 right-3 bg-black/60 text-white/70 text-xs px-3 py-1 rounded-full font-semibold">
                          Variant {page.variant}
                        </div>
                      </div>

                      {/* Card Info */}
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-white/40 text-xs">
                            ~{page.wordCount} words
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setPreviewPage(page)}
                            className="flex-1 bg-indigo-500/20 text-indigo-400 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500/30 transition-colors"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => downloadHtml(page)}
                            className="flex-1 bg-white/5 text-white/60 py-2.5 rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
