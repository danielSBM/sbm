import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sbm: {
          black: "#ffffff",
          "bg-secondary": "#f8fafc",
          "bg-tertiary": "#f1f5f9",
          muted: "#475569",
          "muted-dark": "#64748b",
          indigo: "#2563eb",
          purple: "#1d4ed8",
          violet: "#3b82f6",
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444",
        },
      },
      fontFamily: {
        heading: ["var(--font-inter)", "sans-serif"],
        body: ["var(--font-source-serif)", "Georgia", "serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      backgroundImage: {
        "sbm-gradient":
          "linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #3b82f6 100%)",
      },
      letterSpacing: {
        tighter: "-0.03em",
      },
    },
  },
  plugins: [],
};

export default config;
