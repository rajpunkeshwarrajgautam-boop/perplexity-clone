/**
 * @file web-search.ts
 * @description Real-time web search via Tavily API.
 * Supports focus modes: All (general web), Academic (research papers), Writing (high-quality prose).
 */
import { tavily } from '@tavily/core';

export type WebResult = {
  url: string;
  title: string;
  content: string; // ~500 char snippet
  score: number;   // Tavily relevance 0-1
  domain: string;
  favicon: string;
  publishedDate?: string;
};

export type FocusMode = 'All' | 'Academic' | 'Writing' | 'Web';

/** Domain allow-lists for academic focus */
const ACADEMIC_DOMAINS = [
  'arxiv.org', 'scholar.google.com', 'pubmed.ncbi.nlm.nih.gov',
  'semanticscholar.org', 'researchgate.net', 'jstor.org',
  'nature.com', 'science.org', 'ieee.org', 'springer.com',
];

/**
 * Perform a real-time web search and return structured results.
 */
export async function webSearch(
  query: string,
  focusMode: FocusMode = 'All',
  maxResults = 6,
): Promise<WebResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn('[WebSearch] TAVILY_API_KEY not set — skipping web search.');
    return [];
  }

  const client = tavily({ apiKey });

  const searchOptions: Parameters<typeof client.search>[1] = {
    searchDepth: 'basic',
    maxResults,
    includeAnswer: false,
    includeRawContent: false,
  };

  // Academic focus: restrict to academic domains
  if (focusMode === 'Academic') {
    searchOptions.includeDomains = ACADEMIC_DOMAINS;
    searchOptions.searchDepth = 'advanced';
  }

  try {
    const response = await client.search(query, searchOptions);

    return (response.results ?? []).map((r) => {
      const urlObj = (() => { try { return new URL(r.url); } catch { return null; } })();
      const domain = urlObj?.hostname.replace(/^www\./, '') ?? 'source';
      return {
        url: r.url,
        title: r.title ?? domain,
        content: r.content?.substring(0, 600) ?? '',
        score: r.score ?? 0,
        domain,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
        publishedDate: r.publishedDate,
      };
    });
  } catch (err) {
    console.error('[WebSearch] Tavily error:', err);
    return [];
  }
}

/**
 * Generate 3 sub-queries for Pro Search (iterative decomposition).
 * Used to break complex questions into targeted sub-searches.
 */
export function generateSubQueries(query: string): string[] {
  // Simple heuristic decomposition — in production this would call the LLM
  const cleaned = query.replace(/[?!.]$/, '').trim();
  return [
    cleaned,
    `${cleaned} explained`,
    `${cleaned} latest research 2024 2025`,
  ];
}
