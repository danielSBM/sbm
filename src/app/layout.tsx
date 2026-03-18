import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans, JetBrains_Mono } from "next/font/google";
import { siteConfig } from "../../config/site.config";
import Header from "@/components/Header";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} Blog — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} Blog`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} Blog`,
    description: siteConfig.description,
  },
  alternates: {
    canonical: siteConfig.url,
    types: {
      "application/rss+xml": `${siteConfig.url}/feed.xml`,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: siteConfig.name,
              url: siteConfig.social.website,
              description: siteConfig.description,
              founder: {
                "@type": "Person",
                name: siteConfig.founder,
                jobTitle: "CEO & Founder",
              },
            }),
          }}
        />
      </head>
      <body className="font-body min-h-screen">
        <Header />
        <main>{children}</main>
        <footer className="border-t border-white/5 py-12 mt-20">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <p className="text-sbm-muted-dark text-sm">
              &copy; {new Date().getFullYear()} {siteConfig.name}. All rights
              reserved.
            </p>
            <p className="text-sbm-muted-dark text-xs mt-2">
              {siteConfig.tagline}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
