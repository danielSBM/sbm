"use client";

const STEPS = [
  { num: 1, label: "Brand Input" },
  { num: 2, label: "Analysis & Avatars" },
  { num: 3, label: "Advertorials" },
];

export default function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8">
      {STEPS.map((step, i) => (
        <div key={step.num} className="flex items-center gap-2">
          <div
            className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all
              ${
                currentStep === step.num
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                  : currentStep > step.num
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/5 text-white/30 border border-white/10"
              }
            `}
          >
            {currentStep > step.num ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              step.num
            )}
          </div>
          <span
            className={`text-sm font-medium hidden sm:block ${
              currentStep === step.num
                ? "text-white"
                : currentStep > step.num
                ? "text-emerald-400/70"
                : "text-white/30"
            }`}
          >
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <div
              className={`w-12 h-px mx-2 ${
                currentStep > step.num ? "bg-emerald-500/30" : "bg-white/10"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
