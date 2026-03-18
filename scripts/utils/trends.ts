import googleTrends from "google-trends-api";

export interface TrendData {
  keyword: string;
  relatedQueries: string[];
  risingQueries: string[];
  timelineData: { time: string; value: number }[];
}

export async function getTrendingTopics(
  keywords: string[]
): Promise<TrendData[]> {
  const results: TrendData[] = [];

  for (const keyword of keywords) {
    try {
      // Get interest over time
      const interestResult = await googleTrends.interestOverTime({
        keyword,
        startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days
        geo: "US",
      });

      const interestData = JSON.parse(interestResult);
      const timelineData =
        interestData.default?.timelineData?.map(
          (d: { formattedTime: string; value: number[] }) => ({
            time: d.formattedTime,
            value: d.value[0],
          })
        ) || [];

      // Get related queries
      const relatedResult = await googleTrends.relatedQueries({
        keyword,
        geo: "US",
      });

      const relatedData = JSON.parse(relatedResult);
      const topQueries =
        relatedData.default?.rankedList?.[0]?.rankedKeyword?.map(
          (q: { query: string }) => q.query
        ) || [];
      const risingQueries =
        relatedData.default?.rankedList?.[1]?.rankedKeyword?.map(
          (q: { query: string }) => q.query
        ) || [];

      results.push({
        keyword,
        relatedQueries: topQueries.slice(0, 10),
        risingQueries: risingQueries.slice(0, 10),
        timelineData,
      });

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (error) {
      console.error(`Failed to get trends for "${keyword}":`, error);
      results.push({
        keyword,
        relatedQueries: [],
        risingQueries: [],
        timelineData: [],
      });
    }
  }

  return results;
}
