/**
 * US cities database for local SEO targeting
 * Mix of major metros, mid-size cities, and smaller markets
 * Rotates through cities to avoid duplicates
 */

export interface CityTarget {
  city: string;
  state: string;
  stateAbbr: string;
  population: "major" | "mid" | "small";
  region: string;
}

export const US_CITIES: CityTarget[] = [
  // Major metros (pop 500k+)
  { city: "New York", state: "New York", stateAbbr: "NY", population: "major", region: "Northeast" },
  { city: "Los Angeles", state: "California", stateAbbr: "CA", population: "major", region: "West" },
  { city: "Chicago", state: "Illinois", stateAbbr: "IL", population: "major", region: "Midwest" },
  { city: "Houston", state: "Texas", stateAbbr: "TX", population: "major", region: "South" },
  { city: "Phoenix", state: "Arizona", stateAbbr: "AZ", population: "major", region: "West" },
  { city: "Philadelphia", state: "Pennsylvania", stateAbbr: "PA", population: "major", region: "Northeast" },
  { city: "San Antonio", state: "Texas", stateAbbr: "TX", population: "major", region: "South" },
  { city: "San Diego", state: "California", stateAbbr: "CA", population: "major", region: "West" },
  { city: "Dallas", state: "Texas", stateAbbr: "TX", population: "major", region: "South" },
  { city: "Austin", state: "Texas", stateAbbr: "TX", population: "major", region: "South" },
  { city: "Jacksonville", state: "Florida", stateAbbr: "FL", population: "major", region: "South" },
  { city: "San Jose", state: "California", stateAbbr: "CA", population: "major", region: "West" },
  { city: "Fort Worth", state: "Texas", stateAbbr: "TX", population: "major", region: "South" },
  { city: "Columbus", state: "Ohio", stateAbbr: "OH", population: "major", region: "Midwest" },
  { city: "Charlotte", state: "North Carolina", stateAbbr: "NC", population: "major", region: "South" },
  { city: "Indianapolis", state: "Indiana", stateAbbr: "IN", population: "major", region: "Midwest" },
  { city: "San Francisco", state: "California", stateAbbr: "CA", population: "major", region: "West" },
  { city: "Seattle", state: "Washington", stateAbbr: "WA", population: "major", region: "West" },
  { city: "Denver", state: "Colorado", stateAbbr: "CO", population: "major", region: "West" },
  { city: "Nashville", state: "Tennessee", stateAbbr: "TN", population: "major", region: "South" },
  { city: "Washington", state: "D.C.", stateAbbr: "DC", population: "major", region: "Northeast" },
  { city: "Oklahoma City", state: "Oklahoma", stateAbbr: "OK", population: "major", region: "South" },
  { city: "Las Vegas", state: "Nevada", stateAbbr: "NV", population: "major", region: "West" },
  { city: "Portland", state: "Oregon", stateAbbr: "OR", population: "major", region: "West" },
  { city: "Memphis", state: "Tennessee", stateAbbr: "TN", population: "major", region: "South" },
  { city: "Louisville", state: "Kentucky", stateAbbr: "KY", population: "major", region: "South" },
  { city: "Baltimore", state: "Maryland", stateAbbr: "MD", population: "major", region: "Northeast" },
  { city: "Milwaukee", state: "Wisconsin", stateAbbr: "WI", population: "major", region: "Midwest" },
  { city: "Albuquerque", state: "New Mexico", stateAbbr: "NM", population: "major", region: "West" },
  { city: "Atlanta", state: "Georgia", stateAbbr: "GA", population: "major", region: "South" },
  { city: "Miami", state: "Florida", stateAbbr: "FL", population: "major", region: "South" },
  { city: "Tampa", state: "Florida", stateAbbr: "FL", population: "major", region: "South" },
  { city: "Minneapolis", state: "Minnesota", stateAbbr: "MN", population: "major", region: "Midwest" },

  // Mid-size cities (pop 100k–500k)
  { city: "Boise", state: "Idaho", stateAbbr: "ID", population: "mid", region: "West" },
  { city: "Richmond", state: "Virginia", stateAbbr: "VA", population: "mid", region: "South" },
  { city: "Spokane", state: "Washington", stateAbbr: "WA", population: "mid", region: "West" },
  { city: "Des Moines", state: "Iowa", stateAbbr: "IA", population: "mid", region: "Midwest" },
  { city: "Chattanooga", state: "Tennessee", stateAbbr: "TN", population: "mid", region: "South" },
  { city: "Salt Lake City", state: "Utah", stateAbbr: "UT", population: "mid", region: "West" },
  { city: "Knoxville", state: "Tennessee", stateAbbr: "TN", population: "mid", region: "South" },
  { city: "Savannah", state: "Georgia", stateAbbr: "GA", population: "mid", region: "South" },
  { city: "Charleston", state: "South Carolina", stateAbbr: "SC", population: "mid", region: "South" },
  { city: "Reno", state: "Nevada", stateAbbr: "NV", population: "mid", region: "West" },
  { city: "Huntsville", state: "Alabama", stateAbbr: "AL", population: "mid", region: "South" },
  { city: "Greenville", state: "South Carolina", stateAbbr: "SC", population: "mid", region: "South" },
  { city: "Little Rock", state: "Arkansas", stateAbbr: "AR", population: "mid", region: "South" },
  { city: "Lexington", state: "Kentucky", stateAbbr: "KY", population: "mid", region: "South" },
  { city: "Raleigh", state: "North Carolina", stateAbbr: "NC", population: "mid", region: "South" },
  { city: "Omaha", state: "Nebraska", stateAbbr: "NE", population: "mid", region: "Midwest" },
  { city: "Colorado Springs", state: "Colorado", stateAbbr: "CO", population: "mid", region: "West" },
  { city: "Tulsa", state: "Oklahoma", stateAbbr: "OK", population: "mid", region: "South" },
  { city: "Tucson", state: "Arizona", stateAbbr: "AZ", population: "mid", region: "West" },
  { city: "Fresno", state: "California", stateAbbr: "CA", population: "mid", region: "West" },
  { city: "Sacramento", state: "California", stateAbbr: "CA", population: "mid", region: "West" },
  { city: "Mesa", state: "Arizona", stateAbbr: "AZ", population: "mid", region: "West" },
  { city: "Kansas City", state: "Missouri", stateAbbr: "MO", population: "mid", region: "Midwest" },

  // Small cities (pop 20k–100k) — low competition gold mines
  { city: "Asheville", state: "North Carolina", stateAbbr: "NC", population: "small", region: "South" },
  { city: "Boulder", state: "Colorado", stateAbbr: "CO", population: "small", region: "West" },
  { city: "Bend", state: "Oregon", stateAbbr: "OR", population: "small", region: "West" },
  { city: "Bozeman", state: "Montana", stateAbbr: "MT", population: "small", region: "West" },
  { city: "Cedar Rapids", state: "Iowa", stateAbbr: "IA", population: "small", region: "Midwest" },
  { city: "Fayetteville", state: "Arkansas", stateAbbr: "AR", population: "small", region: "South" },
  { city: "Fort Collins", state: "Colorado", stateAbbr: "CO", population: "small", region: "West" },
  { city: "Gainesville", state: "Florida", stateAbbr: "FL", population: "small", region: "South" },
  { city: "Gilbert", state: "Arizona", stateAbbr: "AZ", population: "small", region: "West" },
  { city: "Lakewood", state: "Colorado", stateAbbr: "CO", population: "small", region: "West" },
  { city: "Murfreesboro", state: "Tennessee", stateAbbr: "TN", population: "small", region: "South" },
  { city: "Naperville", state: "Illinois", stateAbbr: "IL", population: "small", region: "Midwest" },
  { city: "Provo", state: "Utah", stateAbbr: "UT", population: "small", region: "West" },
  { city: "Roseville", state: "California", stateAbbr: "CA", population: "small", region: "West" },
  { city: "Sioux Falls", state: "South Dakota", stateAbbr: "SD", population: "small", region: "Midwest" },
  { city: "Springfield", state: "Missouri", stateAbbr: "MO", population: "small", region: "Midwest" },
  { city: "St. George", state: "Utah", stateAbbr: "UT", population: "small", region: "West" },
  { city: "Tyler", state: "Texas", stateAbbr: "TX", population: "small", region: "South" },
  { city: "Wilmington", state: "North Carolina", stateAbbr: "NC", population: "small", region: "South" },
  { city: "Pensacola", state: "Florida", stateAbbr: "FL", population: "small", region: "South" },
  { city: "Duluth", state: "Minnesota", stateAbbr: "MN", population: "small", region: "Midwest" },
  { city: "Missoula", state: "Montana", stateAbbr: "MT", population: "small", region: "West" },
  { city: "Flagstaff", state: "Arizona", stateAbbr: "AZ", population: "small", region: "West" },
  { city: "Santa Fe", state: "New Mexico", stateAbbr: "NM", population: "small", region: "West" },
  { city: "Rapid City", state: "South Dakota", stateAbbr: "SD", population: "small", region: "Midwest" },
  { city: "Macon", state: "Georgia", stateAbbr: "GA", population: "small", region: "South" },
  { city: "Topeka", state: "Kansas", stateAbbr: "KS", population: "small", region: "Midwest" },
  { city: "Billings", state: "Montana", stateAbbr: "MT", population: "small", region: "West" },
  { city: "Waco", state: "Texas", stateAbbr: "TX", population: "small", region: "South" },
  { city: "Eau Claire", state: "Wisconsin", stateAbbr: "WI", population: "small", region: "Midwest" },
];

/**
 * Local SEO article templates — these are the angles we write for each city.
 * Each template targets different search intents.
 */
export const LOCAL_TEMPLATES = [
  {
    id: "hire-marketing-agency",
    titleTemplate: "How to Hire a Marketing Agency in {city}, {stateAbbr} ({year} Guide)",
    slugTemplate: "hire-marketing-agency-{citySlug}-{stateSlug}",
    primaryKeywordTemplate: "marketing agency {city} {stateAbbr}",
    searchIntent: "commercial" as const,
    category: "Business Growth",
    angle: "Local business owners searching for marketing help — position SBM as the pay-per-result alternative to local retainer agencies",
  },
  {
    id: "get-customers-online",
    titleTemplate: "How to Get Customers Online in {city}: {year} Strategies That Work",
    slugTemplate: "get-customers-online-{citySlug}",
    primaryKeywordTemplate: "get customers online {city}",
    searchIntent: "informational" as const,
    category: "Lead Generation",
    angle: "Business owners wanting more customers — show them online channels then position SBM's pay-per-result model",
  },
  {
    id: "best-advertising",
    titleTemplate: "Best Online Advertising for {city} Small Businesses ({year})",
    slugTemplate: "best-online-advertising-{citySlug}",
    primaryKeywordTemplate: "online advertising {city} small business",
    searchIntent: "commercial" as const,
    category: "Performance Marketing",
    angle: "Small business owners comparing ad options — compare retainer vs pay-per-result models",
  },
  {
    id: "digital-marketing-cost",
    titleTemplate: "How Much Does Digital Marketing Cost in {city}, {stateAbbr}?",
    slugTemplate: "digital-marketing-cost-{citySlug}-{stateSlug}",
    primaryKeywordTemplate: "digital marketing cost {city}",
    searchIntent: "transactional" as const,
    category: "Business Growth",
    angle: "Price-sensitive business owners — show average costs then introduce pay-per-result as risk-free alternative",
  },
  {
    id: "facebook-ads-local",
    titleTemplate: "Facebook Ads for {city} Businesses: Complete {year} Playbook",
    slugTemplate: "facebook-ads-{citySlug}-businesses",
    primaryKeywordTemplate: "Facebook ads {city}",
    searchIntent: "informational" as const,
    category: "Paid Social",
    angle: "Local businesses wanting to run Facebook ads — educate then offer SBM managed campaigns",
  },
  {
    id: "google-ads-local",
    titleTemplate: "Google Ads for {city} Businesses: How to Get More Leads",
    slugTemplate: "google-ads-{citySlug}-businesses",
    primaryKeywordTemplate: "Google ads {city} businesses",
    searchIntent: "commercial" as const,
    category: "Performance Marketing",
    angle: "Businesses wanting Google ad leads — show complexity then offer done-for-you pay-per-result",
  },
];

/**
 * Get today's cities to target — picks 1 major + 1 small/mid for variety
 * Rotates based on the day of the year so we don't repeat
 */
export function getTodaysCities(count: number = 2): CityTarget[] {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );

  const majorCities = US_CITIES.filter((c) => c.population === "major");
  const smallMidCities = US_CITIES.filter((c) => c.population !== "major");

  const selected: CityTarget[] = [];

  // Pick from major cities
  selected.push(majorCities[dayOfYear % majorCities.length]);

  // Pick from small/mid cities
  selected.push(smallMidCities[dayOfYear % smallMidCities.length]);

  // If more needed, keep alternating
  for (let i = 2; i < count; i++) {
    const pool = i % 2 === 0 ? majorCities : smallMidCities;
    selected.push(pool[(dayOfYear + i) % pool.length]);
  }

  return selected.slice(0, count);
}

/**
 * Get a random template for a city (rotates based on day + city index)
 */
export function getTemplateForCity(cityIndex: number): typeof LOCAL_TEMPLATES[number] {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );

  return LOCAL_TEMPLATES[(dayOfYear + cityIndex) % LOCAL_TEMPLATES.length];
}
