import { CheerioCrawler, Configuration } from 'crawlee';

export async function searchDuckDuckGo(query: string): Promise<string[]> {
  const links: string[] = [];
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  // Configure Crawlee to not use persistent storage (override configuration)
  const config = new Configuration({
    persistStorage: false,
    purgeOnStart: true,
  });

  const crawler = new CheerioCrawler({
    maxRequestsPerCrawl: 1,
    // Use custom configuration
    requestHandler: async ({ $ }) => {
      // Find all result links
      // DuckDuckGo HTML usually has results in a.result__url or a.result__snippet
      $('.result__url, .result__snippet, a.result__link').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;

        let targetUrl = '';
        if (href.includes('uddg=')) {
          const match = href.match(/[&?]uddg=([^&]+)/);
          if (match && match[1]) {
            targetUrl = decodeURIComponent(match[1]);
          }
        } else if (href.startsWith('http://') || href.startsWith('https://')) {
          // Exclude internal DuckDuckGo links unless they have uddg
          if (!href.includes('duckduckgo.com/')) {
            targetUrl = href;
          }
        }

        if (targetUrl && !links.includes(targetUrl)) {
          links.push(targetUrl);
        }
      });
    },
  }, config);

  // Run the crawler
  await crawler.run([searchUrl]);

  // Return the top 5 links
  return links.slice(0, 5);
}
