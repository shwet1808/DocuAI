/**
 * @file searchEngine.ts
 * @description DuckDuckGo organic search engine scraper using Crawlee.
 */

import { CheerioCrawler, Configuration } from "crawlee";

import type { Result } from "../types.js";

/**
 * Searches DuckDuckGo for the given query and returns the top 5 organic links.
 * Resolves redirects containing the 'uddg' query parameter.
 * 
 * @param query The search query string.
 * @returns A promise resolving to a Result containing the list of URLs.
 */
export async function searchDuckDuckGo(query: string): Promise<Result<readonly string[]>> {
  const config = new Configuration({
    persistStorage: false,
  });

   
  const urlsCollected: string[] = [];

  const crawler = new CheerioCrawler({
    maxRequestsPerCrawl: 1,
    requestHandler: async ({ $, log }): Promise<void> => {
      log.info(`Scraping search results for query: ${query}`);
      
      const elements = $(".result__url, .result__snippet, .result__title a");
      
      elements.each((_, el) => {
        const href = $(el).attr("href");
        if (typeof href !== "string") return;
        
        const urlObj = URL.canParse(href, "https://html.duckduckgo.com")
          ? new URL(href, "https://html.duckduckgo.com")
          : null;
        if (!urlObj) return;

        const uddg = urlObj.searchParams.get("uddg");
        if (typeof uddg === "string") {
          const decoded = decodeURIComponent(uddg);
          if (!urlsCollected.includes(decoded)) {
            // eslint-disable-next-line functional/immutable-data
            urlsCollected.push(decoded);
          }
        }
      });

      await Promise.resolve();
    },
  }, config);

  // eslint-disable-next-line functional/no-try-statements
  try {
    await crawler.run([`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`]);
    
    return {
      success: true,
      value: Object.freeze(urlsCollected.slice(0, 5)),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
