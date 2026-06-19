/**
 * @file deepScraper.ts
 * @description Concurrently crawls URLs, extracts reader-view content, converts to Markdown, and truncates.
 */

import pkgReadability from "@mozilla/readability";
import { CheerioCrawler, Configuration } from "crawlee";
import { JSDOM, VirtualConsole } from "jsdom";
import TurndownService from "turndown";

import type { Result } from "../types.js";

const { Readability } = pkgReadability;

interface ScrapeResult {
  readonly url: string;
  readonly markdown: string;
}

/**
 * Scrapes the provided URLs concurrently, extracts their readability content,
 * converts to Markdown, and returns the aggregated text.
 * 
 * @param urls The list of URLs to scrape.
 * @returns A promise resolving to a Result containing the combined markdown content.
 */
export async function scrapeUrls(urls: readonly string[]): Promise<Result<string>> {
  if (urls.length === 0) {
    return { success: true, value: "" };
  }

  const config = new Configuration({
    persistStorage: false,
  });

   
  const results: ScrapeResult[] = [];

  const crawler = new CheerioCrawler({
    requestHandlerTimeoutSecs: 60,
    // Crawl concurrently
    requestHandler: async ({ request, body, log }): Promise<void> => {
      log.info(`Scraping content from URL: ${request.url}`);
      
      const html = body.toString();
      
      // Use VirtualConsole to suppress annoying stylesheet parsing errors from JSDOM
      const virtualConsole = new VirtualConsole();
      virtualConsole.on("error", (): void => {});
      
      const dom = new JSDOM(html, {
        url: request.url,
        virtualConsole,
      });
      
      // Extract main content using Mozilla Readability
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      
      if (article && typeof article.content === "string") {
        const turndownService = new TurndownService();
        const markdown = turndownService.turndown(article.content);
        const truncated = markdown.length > 800
          ? `${markdown.slice(0, 800)}... (truncated)`
          : markdown;
          
        const result: ScrapeResult = {
          url: request.url,
          markdown: `### Source: ${request.url}\n\n${truncated}`,
        };
        
        // eslint-disable-next-line functional/immutable-data
        results.push(result);
      } else {
        log.warning(`Failed to parse readable content from: ${request.url}`);
      }
      
      await Promise.resolve();
    },
  }, config);

  // eslint-disable-next-line functional/no-try-statements
  try {
    // Convert readonly string[] to string[] for Crawlee run
    await crawler.run([...urls]);
    
    // Sort results to match original URLs order
    const orderedResults = urls
      .map(url => results.find(r => r.url === url))
      .filter((r): r is ScrapeResult => typeof r !== "undefined")
      .map(r => r.markdown);

    return {
      success: true,
      value: orderedResults.join("\n\n---\n\n"),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
