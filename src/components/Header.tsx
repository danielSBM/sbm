import Link from "next/link";
import { siteConfig } from "../../config/site.config";

export default function Header() {
  return (
    <header className="border-b border-white/5 sticky top-0 z-50 bg-sbm-black/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-sbm-gradient flex items-center justify-center">
            <span className="text-white font-heading font-bold text-sm">
              S
            </span>
          </div>
          <span className="font-heading font-bold text-lg tracking-tighter text-white group-hover:text-sbm-indigo transition-colors">
            {siteConfig.name}
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/blog"
            className="text-sbm-muted hover:text-white text-sm font-body transition-colors"
          >
            Blog
          </Link>
          <a
            href={siteConfig.cta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="sbm-cta text-xs"
          >
            {siteConfig.cta.text}
          </a>
        </nav>
      </div>
    </header>
  );
}
