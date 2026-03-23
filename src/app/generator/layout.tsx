import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Advertorial Generator — Seen By Many",
  description: "AI-powered advertorial creation tool",
  robots: "noindex, nofollow",
};

export default function GeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-bold">
              S
            </div>
            <span className="font-semibold text-lg tracking-tight">
              Advertorial Generator
            </span>
          </div>
          <span className="text-xs text-white/40 font-mono">
            by Seen By Many
          </span>
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>
    </div>
  );
}
