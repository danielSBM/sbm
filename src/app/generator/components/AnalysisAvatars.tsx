"use client";

import { useState } from "react";

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

interface AnalysisAvatarsProps {
  analysis: Record<string, unknown>;
  avatars: Avatar[] | null;
  isLoadingAvatars: boolean;
  onGenerateAvatars: () => void;
  onSelectAvatars: (selected: Avatar[]) => void;
  sources: { claude: boolean; gemini: boolean } | null;
}

export default function AnalysisAvatars({
  analysis,
  avatars,
  isLoadingAvatars,
  onGenerateAvatars,
  onSelectAvatars,
  sources,
}: AnalysisAvatarsProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const hasEnoughInfo =
    typeof analysis.readinessScore === "number" &&
    analysis.readinessScore >= 7;

  const toggleAvatar = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleProceed = () => {
    if (!avatars) return;
    const selected = avatars.filter((a) => selectedIds.has(a.id));
    onSelectAvatars(selected);
  };

  return (
    <div className="max-w-4xl mx-auto px-6">
      {/* Analysis Summary */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          {hasEnoughInfo ? (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-6 py-4 w-full">
              <svg className="w-6 h-6 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-emerald-400 font-bold text-lg">I have all the information needed.</p>
                <p className="text-emerald-400/60 text-sm">
                  Readiness score: {String(analysis.readinessScore)}/10
                  {sources && (
                    <span className="ml-3">
                      Sources: {sources.claude ? "Claude" : ""}{sources.claude && sources.gemini ? " + " : ""}{sources.gemini ? "Gemini" : ""}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-6 py-4 w-full">
              <svg className="w-6 h-6 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-amber-400 font-bold">Some information may be missing</p>
                <p className="text-amber-400/60 text-sm">
                  Readiness score: {String(analysis.readinessScore)}/10. We can still proceed, but results may be less targeted.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Analysis Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <AnalysisCard label="Brand" value={String(analysis.brandName || "—")} />
          <AnalysisCard label="Industry" value={String(analysis.industry || "—")} />
          <AnalysisCard label="Core Problem" value={String(analysis.coreProblemSolved || "—")} />
          <AnalysisCard label="Unique Mechanism" value={String(analysis.uniqueMechanism || "—")} />
          <AnalysisCard
            label="Target"
            value={
              analysis.targetDemographic
                ? `${(analysis.targetDemographic as Record<string, string>).ageRange || ""}, ${(analysis.targetDemographic as Record<string, string>).gender || ""}`
                : "—"
            }
          />
          <AnalysisCard label="Angle" value={String(analysis.advertorialAngle || "—")} />
        </div>

        {/* Emotional Drivers */}
        {Array.isArray(analysis.emotionalDrivers) && analysis.emotionalDrivers.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-8">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
              Emotional Drivers
            </h3>
            <ul className="space-y-2">
              {(analysis.emotionalDrivers as string[]).map((d, i) => (
                <li key={i} className="text-white/70 text-sm flex gap-2">
                  <span className="text-indigo-400 mt-0.5">&#9679;</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing Info */}
        {Array.isArray(analysis.missingInfo) && analysis.missingInfo.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 mb-8">
            <h3 className="text-sm font-semibold text-amber-400/70 uppercase tracking-wider mb-3">
              Missing Information
            </h3>
            <ul className="space-y-1">
              {(analysis.missingInfo as string[]).map((m, i) => (
                <li key={i} className="text-amber-400/60 text-sm">• {m}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Generate Avatars Button */}
      {!avatars && !isLoadingAvatars && (
        <div className="text-center mb-10">
          <button
            onClick={onGenerateAvatars}
            className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:from-indigo-400 hover:to-violet-500 shadow-lg shadow-indigo-500/25 transition-all"
          >
            Generate Target Avatars
          </button>
          <p className="text-white/30 text-sm mt-3">
            AI will identify the 5 best customer avatars for your advertorial campaigns
          </p>
        </div>
      )}

      {/* Loading Avatars */}
      {isLoadingAvatars && (
        <div className="text-center py-16">
          <svg className="animate-spin h-10 w-10 mx-auto mb-4 text-indigo-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-white/50 text-lg">Generating target avatars...</p>
          <p className="text-white/30 text-sm mt-2">
            Identifying the 5 best psychological entry points for your audience
          </p>
        </div>
      )}

      {/* Avatar Selection */}
      {avatars && avatars.length > 0 && (
        <>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Select Your Target Avatars</h2>
            <p className="text-white/50">
              Choose which avatars to create advertorial landing pages for.
              Each avatar gets 2 unique page variants.
            </p>
          </div>

          <div className="space-y-4 mb-10">
            {avatars.map((avatar) => (
              <div
                key={avatar.id}
                className={`
                  border rounded-xl p-6 transition-all cursor-pointer
                  ${
                    selectedIds.has(avatar.id)
                      ? "bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/10"
                      : "bg-white/[0.02] border-white/10 hover:border-white/20"
                  }
                `}
                onClick={() => toggleAvatar(avatar.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <div
                    className={`
                      w-6 h-6 rounded-md border-2 flex-shrink-0 mt-1 flex items-center justify-center transition-all
                      ${
                        selectedIds.has(avatar.id)
                          ? "bg-indigo-500 border-indigo-500"
                          : "border-white/20"
                      }
                    `}
                  >
                    {selectedIds.has(avatar.id) && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-white">{avatar.name}</h3>
                      <span className="text-xs bg-white/10 text-white/50 px-2 py-1 rounded-full">
                        Age {avatar.age}
                      </span>
                      <span className="text-xs bg-white/10 text-white/50 px-2 py-1 rounded-full">
                        {avatar.profession}
                      </span>
                    </div>

                    <p className="text-white/60 text-sm mb-3">{avatar.lifeSituation}</p>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-indigo-400 font-semibold">Angle:</span>
                      <span className="text-xs text-white/50">{avatar.advertorialAngle}</span>
                    </div>

                    {/* Expandable Details */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(expandedId === avatar.id ? null : avatar.id);
                      }}
                      className="text-xs text-indigo-400/70 hover:text-indigo-400 mt-3 flex items-center gap-1"
                    >
                      {expandedId === avatar.id ? "Hide" : "Show"} details
                      <svg
                        className={`w-3 h-3 transition-transform ${expandedId === avatar.id ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {expandedId === avatar.id && (
                      <div className="mt-4 space-y-3 text-sm border-t border-white/5 pt-4">
                        <DetailRow label="Trigger Moment" value={avatar.triggerMoment} />
                        <DetailRow label="Emotional Wound" value={avatar.emotionalWound} />
                        <DetailRow label="Heartbreak Moment" value={avatar.heartbreakMoment} />
                        <DetailRow label="Buying Motivation" value={avatar.buyingMotivation} />
                        <DetailRow
                          label="Character"
                          value={`${avatar.characterDetails.firstName}, ${avatar.characterDetails.definingDetail}. Story centers on ${avatar.characterDetails.lovedOne} (${avatar.characterDetails.lovedOneRelationship}).`}
                        />
                        <DetailRow
                          label="Failed Attempts"
                          value={avatar.failedAttempts.join(" → ")}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Proceed */}
          <div className="text-center pb-16">
            <button
              onClick={handleProceed}
              disabled={selectedIds.size === 0}
              className={`
                px-10 py-4 rounded-xl font-bold text-lg transition-all
                ${
                  selectedIds.size > 0
                    ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-400 hover:to-violet-500 shadow-lg shadow-indigo-500/25 cursor-pointer"
                    : "bg-white/5 text-white/30 cursor-not-allowed"
                }
              `}
            >
              Generate Advertorials ({selectedIds.size} avatar{selectedIds.size !== 1 ? "s" : ""} &times; 2 pages = {selectedIds.size * 2} pages)
            </button>
            <p className="text-white/30 text-sm mt-3">
              Each selected avatar will get 2 unique advertorial landing pages
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function AnalysisCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-white/80 text-sm leading-relaxed">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-white/40 font-semibold">{label}:</span>{" "}
      <span className="text-white/60">{value}</span>
    </div>
  );
}
