/**
 * Advertorial template system for client campaigns
 *
 * Based on the proven 5-stage advertorial architecture:
 * 1. The Hook — Specific character + emotional setup
 * 2. The Emotional Breaking Point — The moment that makes the reader feel
 * 3. The Failed Solutions — Why what they've tried doesn't work
 * 4. The Mechanism — New belief shift / root cause reframe
 * 5. The Payoff — Story resolution + CTA fork-in-the-road
 *
 * Each template defines the niche-specific variables that get
 * injected into the generation prompt. The AI writes the copy;
 * these templates shape the structure.
 */

// ─── Types ───────────────────────────────────────────────────────

export interface AdvertorialTemplate {
  id: string;
  /** Human-readable name shown in dashboards */
  name: string;
  /** The niche / vertical this template targets */
  niche: string;
  /** Target audience description */
  audience: string;
  /** Age range of primary reader */
  ageRange: string;
  /** The core problem the product solves */
  coreProblem: string;
  /** The deeper emotional cost the reader hasn't said out loud */
  emotionalCost: string;
  /** What the reader has already tried (the "old way") */
  failedSolutions: string[];
  /** Why the old solutions only treat the symptom */
  whyOldWayFails: string;
  /** The new mechanism / belief shift */
  mechanism: {
    name: string;
    explanation: string;
    analogy: string;
  };
  /** Borrowed authority — studies, institutions, experts to reference */
  borrowedAuthority: string[];
  /** Product details injected into the template */
  product: {
    name: string;
    price: string;
    originalPrice: string;
    guarantee: string;
    keyFeatures: string[];
    frictionKillers: string[];
  };
  /** Trust stack elements in order */
  trustStack: {
    mediaLogos: string[];
    expertEndorsement: string;
    reviewCount: string;
    videoTestimonials: boolean;
  };
  /** CTA framing — the "fork in the road" language */
  ctaFraming: {
    stayPath: string;
    changePath: string;
    buttonText: string;
    urgencyNote: string;
  };
}

export interface AdvertorialBrief {
  /** Client company name */
  clientName: string;
  /** Product or service being advertised */
  productName: string;
  /** The URL the CTA button should link to */
  ctaUrl: string;
  /** Which template to use */
  templateId: string;
  /** Optional overrides for any template field */
  overrides?: Partial<AdvertorialTemplate>;
}

// ─── Templates ───────────────────────────────────────────────────

export const ADVERTORIAL_TEMPLATES: AdvertorialTemplate[] = [
  {
    id: "hearing-aid",
    name: "Hearing Aid — Grandparent Connection",
    niche: "Health & Wellness — Hearing",
    audience: "Adults 55+ experiencing hearing loss, their adult children",
    ageRange: "55-80",
    coreProblem: "Progressive hearing loss isolating them from family",
    emotionalCost:
      "Becoming a ghost at your own dinner table. Missing grandchildren's whispers. Declining invitations because group settings are exhausting. Smiling and nodding through conversations you can't follow.",
    failedSolutions: [
      "Traditional hearing aids — bulky, whistling, stigmatizing",
      "Turning up the TV volume — annoys everyone else",
      "Asking people to repeat themselves — embarrassing",
      "Avoiding social situations entirely — isolation spiral",
    ],
    whyOldWayFails:
      "Traditional hearing aids are just amplifiers. They turn up the volume on everything — the dishwasher, background chatter, traffic. Your brain has to work harder to filter, causing fatigue. It's not an ear problem. It's a brain processing problem.",
    mechanism: {
      name: "Crystal Clear Neural Processor",
      explanation:
        "Analyzes sound 1,000 times per second, separating human voice from background noise using brain-first processing",
      analogy:
        "It works like Portrait Mode on your smartphone camera — blurs the background noise and sharpens the human voice",
    },
    borrowedAuthority: [
      "Johns Hopkins study linking untreated hearing loss to 3x increased risk of cognitive decline",
      "National Institute on Aging data on hearing loss prevalence",
      "Lancet Commission identifying hearing loss as the #1 modifiable risk factor for dementia",
    ],
    product: {
      name: "[Product Name]",
      price: "$99",
      originalPrice: "$199",
      guarantee: "45-day satisfaction guarantee",
      keyFeatures: [
        "Nearly invisible design",
        "Rechargeable — no tiny batteries",
        "Three-step setup: turn on, insert, hear",
        "Ships from U.S. warehouse",
      ],
      frictionKillers: [
        "No doctor needed",
        "No hearing test required",
        "No prescription",
        "No insurance hassle",
      ],
    },
    trustStack: {
      mediaLogos: ["ABC", "FOX", "NBC", "CBS", "Good Morning America"],
      expertEndorsement: "Recommended by 399+ clinicians on independent medical review platforms",
      reviewCount: "12,000+",
      videoTestimonials: true,
    },
    ctaFraming: {
      stayPath: "You can keep nodding politely, feeling your world get smaller with each missed conversation",
      changePath: "Or you can do what Arthur did — and hear every word again",
      buttonText: "Try It Risk-Free for 45 Days",
      urgencyNote: "Spring pricing: 50% off while supplies last",
    },
  },

  {
    id: "joint-pain",
    name: "Joint Pain — Active Lifestyle Recovery",
    niche: "Health & Wellness — Mobility",
    audience: "Adults 45-75 with chronic knee, hip, or back pain limiting their activity",
    ageRange: "45-75",
    coreProblem: "Chronic joint pain stealing their active life",
    emotionalCost:
      "Watching your grandkids play from the sidelines. Giving up the morning walk you used to love. Your spouse hiking alone because you can't keep up. Becoming the person who sits while everyone else lives.",
    failedSolutions: [
      "Over-the-counter painkillers — mask the symptom, damage the stomach",
      "Prescription anti-inflammatories — side effects, dependency concerns",
      "Physical therapy — expensive, time-consuming, temporary relief",
      "Surgery — invasive, risky, long recovery, no guarantee",
    ],
    whyOldWayFails:
      "These approaches treat joint pain like a pain problem. But pain is a signal, not the disease. The real issue is cartilage degradation and chronic inflammation at the cellular level. Silencing the alarm doesn't fix the fire.",
    mechanism: {
      name: "Cellular Cartilage Restoration",
      explanation:
        "Delivers bioavailable collagen peptides directly to joint tissue, stimulating your body's own cartilage-building cells (chondrocytes) to rebuild the cushion between your bones",
      analogy:
        "Think of it like re-grouting tile. The structure is still there — the cushioning between the tiles has just worn away. This rebuilds the grout instead of just painting over the cracks.",
    },
    borrowedAuthority: [
      "Harvard Medical School research on collagen peptide absorption rates",
      "British Journal of Sports Medicine study showing 40% improvement in joint function",
      "Mayo Clinic guidelines on cartilage preservation",
    ],
    product: {
      name: "[Product Name]",
      price: "$49/month",
      originalPrice: "$89/month",
      guarantee: "90-day money-back guarantee",
      keyFeatures: [
        "Clinically studied ingredients",
        "Results in as few as 14 days",
        "One small capsule daily — no powders or drinks",
        "Made in FDA-registered U.S. facility",
      ],
      frictionKillers: [
        "No prescription needed",
        "Free shipping on every order",
        "Cancel anytime — no commitment",
        "Subscribe & save 45%",
      ],
    },
    trustStack: {
      mediaLogos: ["Men's Health", "Prevention", "WebMD", "Healthline"],
      expertEndorsement: "Formulated with guidance from board-certified orthopedic specialists",
      reviewCount: "8,500+",
      videoTestimonials: true,
    },
    ctaFraming: {
      stayPath: "You can keep sitting on the sidelines, watching life happen without you",
      changePath: "Or you can do what Margaret did — lace up your shoes and walk back into your life",
      buttonText: "Start Your 90-Day Risk-Free Trial",
      urgencyNote: "First bottle ships free — limited availability",
    },
  },

  {
    id: "sleep",
    name: "Sleep — The Exhausted Professional",
    niche: "Health & Wellness — Sleep",
    audience: "Adults 30-65 who can't fall asleep or stay asleep, affecting work and relationships",
    ageRange: "30-65",
    coreProblem: "Chronic poor sleep destroying their energy, focus, and patience",
    emotionalCost:
      "Snapping at your kids because you're running on four hours. Zoning out in meetings you used to lead. Dreading bedtime because you know you'll just stare at the ceiling. Your partner sleeping in the guest room because your tossing keeps them awake.",
    failedSolutions: [
      "Melatonin — works for a week, then stops",
      "Prescription sleep aids — groggy mornings, dependency risk",
      "Sleep hygiene tips — you've tried them all, still awake at 2am",
      "CBD/THC — inconsistent results, legal concerns",
    ],
    whyOldWayFails:
      "These solutions treat insomnia like a chemical deficiency. Just add the right molecule and you'll sleep. But the real problem isn't chemistry — it's your nervous system stuck in fight-or-flight mode. Your brain won't power down because it doesn't feel safe enough to sleep.",
    mechanism: {
      name: "Parasympathetic Reset Technology",
      explanation:
        "Uses calibrated frequency patterns to activate your vagus nerve — the master switch between your stress response and rest-and-digest mode — training your nervous system to downshift naturally",
      analogy:
        "It's like putting a screaming toddler in a car seat and going for a drive. The gentle, rhythmic motion doesn't knock them out with chemicals — it tells their nervous system it's safe to let go.",
    },
    borrowedAuthority: [
      "Stanford Sleep Medicine Center research on vagal tone and sleep onset",
      "Nature Neuroscience study on frequency-driven parasympathetic activation",
      "Cleveland Clinic sleep hygiene guidelines",
    ],
    product: {
      name: "[Product Name]",
      price: "$79",
      originalPrice: "$149",
      guarantee: "60-night sleep guarantee — if you don't sleep better, full refund",
      keyFeatures: [
        "Non-habit forming — no chemicals or drugs",
        "Works from the first night",
        "Compact bedside device — no wearables",
        "Adapts to your sleep patterns over time",
      ],
      frictionKillers: [
        "No prescription needed",
        "No app required",
        "Free return shipping if it doesn't work",
        "One-time purchase — no subscriptions",
      ],
    },
    trustStack: {
      mediaLogos: ["The New York Times", "Wired", "Sleep Foundation", "Today Show"],
      expertEndorsement: "Developed in partnership with board-certified sleep neurologists",
      reviewCount: "15,000+",
      videoTestimonials: true,
    },
    ctaFraming: {
      stayPath: "You can keep dragging through days half-awake, watching your patience and sharpness fade",
      changePath: "Or you can do what David did — fall asleep in 12 minutes and wake up feeling like yourself again",
      buttonText: "Try It for 60 Nights Risk-Free",
      urgencyNote: "Spring sale: 47% off — ends this week",
    },
  },

  {
    id: "weight-loss",
    name: "Weight Loss — The Metabolism Shift",
    niche: "Health & Wellness — Weight Management",
    audience: "Adults 35-65 who've tried every diet and exercise plan without lasting results",
    ageRange: "35-65",
    coreProblem: "Stubborn weight that won't respond to diet and exercise anymore",
    emotionalCost:
      "Stepping on the scale every morning and feeling defeated before the day starts. Avoiding mirrors, photos, pool parties. Your clothes don't fit but you refuse to buy the next size up because that means accepting this is permanent. Eating the same salad as everyone else but being the only one who doesn't lose weight.",
    failedSolutions: [
      "Calorie restriction — lose 10 lbs, gain back 15",
      "Gym memberships — exercised for months, scale barely moved",
      "Keto / intermittent fasting — unsustainable and exhausting",
      "Weight loss pills — jitters, crashes, no lasting results",
    ],
    whyOldWayFails:
      "Every one of these approaches treats weight like a math problem: burn more than you eat. But after 35, the equation changes. Hormonal shifts, cortisol from chronic stress, and metabolic adaptation mean your body is actively fighting to keep the weight on. You're not failing the diet. The diet is failing your biology.",
    mechanism: {
      name: "Metabolic Switch Activation",
      explanation:
        "Targets the three hormonal levers — cortisol, leptin, and insulin sensitivity — that control whether your body stores fat or burns it, resetting your metabolic thermostat to its younger set point",
      analogy:
        "Your metabolism has a thermostat, like your house. Dieting is like opening the windows in winter — you cool down temporarily, but the furnace kicks on harder. This product resets the thermostat itself.",
    },
    borrowedAuthority: [
      "New England Journal of Medicine study on metabolic adaptation after weight loss",
      "Endocrine Society research on cortisol-driven visceral fat storage",
      "NIH data showing 95% of diets fail within 5 years",
    ],
    product: {
      name: "[Product Name]",
      price: "$59/month",
      originalPrice: "$99/month",
      guarantee: "90-day transformation guarantee",
      keyFeatures: [
        "Clinically studied botanical compounds",
        "Visible results in 2-3 weeks",
        "No stimulants — no jitters or crashes",
        "Works with any eating style",
      ],
      frictionKillers: [
        "No prescription needed",
        "No restrictive diet required",
        "Free shipping + free returns",
        "Pause or cancel anytime",
      ],
    },
    trustStack: {
      mediaLogos: ["Women's Health", "Shape", "Good Housekeeping", "Dr. Oz"],
      expertEndorsement: "Endorsed by 200+ integrative medicine practitioners",
      reviewCount: "22,000+",
      videoTestimonials: true,
    },
    ctaFraming: {
      stayPath: "You can keep fighting your own biology, trying the same diets that failed before",
      changePath: "Or you can do what Susan did — work with your metabolism instead of against it",
      buttonText: "Start Your 90-Day Transformation",
      urgencyNote: "40% off first 3 months — limited spring pricing",
    },
  },

  {
    id: "generic",
    name: "Generic — Customize for Any Niche",
    niche: "[Client Niche]",
    audience: "[Target Audience Description]",
    ageRange: "[Age Range]",
    coreProblem: "[Core Problem]",
    emotionalCost: "[Deeper Emotional Cost — what they're really losing]",
    failedSolutions: [
      "[Failed Solution 1]",
      "[Failed Solution 2]",
      "[Failed Solution 3]",
      "[Failed Solution 4]",
    ],
    whyOldWayFails: "[Why the old approach only treats the symptom, not the root cause]",
    mechanism: {
      name: "[New Mechanism Name]",
      explanation: "[How the mechanism works — 1-2 sentences]",
      analogy: "[Everyday analogy that makes the mechanism instantly understandable]",
    },
    borrowedAuthority: [
      "[Study / Institution 1]",
      "[Study / Institution 2]",
      "[Study / Institution 3]",
    ],
    product: {
      name: "[Product Name]",
      price: "[Sale Price]",
      originalPrice: "[Original Price]",
      guarantee: "[Guarantee — days + terms]",
      keyFeatures: ["[Feature 1]", "[Feature 2]", "[Feature 3]", "[Feature 4]"],
      frictionKillers: ["[Friction Killer 1]", "[Friction Killer 2]", "[Friction Killer 3]", "[Friction Killer 4]"],
    },
    trustStack: {
      mediaLogos: ["[Media 1]", "[Media 2]", "[Media 3]", "[Media 4]"],
      expertEndorsement: "[Expert / Clinical Endorsement]",
      reviewCount: "[Number]+",
      videoTestimonials: true,
    },
    ctaFraming: {
      stayPath: "[The painful path if they do nothing]",
      changePath: "[The hopeful path with the product — reference the story character]",
      buttonText: "[CTA Button Text]",
      urgencyNote: "[Scarcity / Urgency Note]",
    },
  },
];

/**
 * Get a template by ID
 */
export function getAdvertorialTemplate(id: string): AdvertorialTemplate | undefined {
  return ADVERTORIAL_TEMPLATES.find((t) => t.id === id);
}

/**
 * List all available template IDs
 */
export function listAdvertorialTemplates(): { id: string; name: string; niche: string }[] {
  return ADVERTORIAL_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    niche: t.niche,
  }));
}
