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
          black: "#0a0a0f",
          "bg-secondary": "#12121a",
          "bg-tertiary": "#1a1a25",
          muted: "#a1a1aa",
          "muted-dark": "#71717a",
          indigo: "#6366f1",
          purple: "#8b5cf6",
          violet: "#a855f7",
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444",
        },
      },
      fontFamily: {
        heading: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      backgroundImage: {
        "sbm-gradient":
          "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
      },
      letterSpacing: {
        tighter: "-0.03em",
      },
    },
  },
  plugins: [],
};

export default config;
