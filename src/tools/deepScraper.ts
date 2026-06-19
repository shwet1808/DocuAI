import { Readability } from '@mozilla/readability';
import { CheerioCrawler, Configuration } from 'crawlee';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

export interface ScrapedResult {
  url: string;
  title: string;
  markdown: string;
}

export async function scrapeUrls(urls: string[]): Promise<ScrapedResult[]> {
  const results: ScrapedResult[] = [];
  const turndownService = new TurndownService();

  const config = new Configuration({
    persistStorage: false,
    purgeOnStart: true,
  });

  const crawler = new CheerioCrawler({
    maxConcurrency: 5,
    requestHandler: async ({ request, body }) => {
      try {
        const dom = new JSDOM(body, { url: request.url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        let title = '';
        let markdown = '';

        if (article) {
          title = article.title || request.url;
          markdown = turndownService.turndown(article.content || '');
        } else {
          // Fallback to basic text content extraction if readability fails
          title = dom.window.document.title || request.url;
          const bodyText = dom.window.document.body?.textContent || '';
          markdown = turndownService.turndown(bodyText);
        }

        // Clean up markdown spacing
        markdown = markdown.replace(/\s+/g, ' ').trim();

        // Truncate to a max of 800 characters
        if (markdown.length > 800) {
          markdown = markdown.slice(0, 800) + '\n... (truncated)';
        }

        results.push({
          url: request.url,
          title,
          markdown,
        });
      } catch (err) {
        console.error(`Error processing content for ${request.url}:`, err);
      }
    },
    failedRequestHandler: async ({ request, error }) => {
      console.error(`Failed crawling request ${request.url}:`, error);
    },
  }, config);

  if (urls.length > 0) {
    await crawler.run(urls);
  }

  return results;
}
