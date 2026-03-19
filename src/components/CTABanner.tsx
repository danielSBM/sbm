import { siteConfig } from "../../config/site.config";

export default function CTABanner() {
  return (
    <div className="my-12 p-8 rounded-2xl bg-blue-50 border border-blue-200 text-center">
      <h3 className="font-heading font-bold text-2xl tracking-tighter text-gray-900 mb-3">
        Stop Paying for Ads That Don&apos;t Work
      </h3>
      <p className="text-gray-600 max-w-lg mx-auto mb-6">
        We generate new customers for your business. You only pay for results.
        No retainers. No risk.
      </p>
      <a
        href={siteConfig.cta.url}
        target="_blank"
        rel="noopener noreferrer"
        className="sbm-cta"
      >
        {siteConfig.cta.text}
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 8l4 4m0 0l-4 4m4-4H3"
          />
        </svg>
      </a>
    </div>
  );
}
