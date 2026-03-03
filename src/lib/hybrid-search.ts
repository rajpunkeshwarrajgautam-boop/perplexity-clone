/**
 * @file hybrid-search.ts
 * @description Unifies vector search (dense) and web search (sparse/live) into a single
 * context stream, ranked by relevance and deduplicated by domain/source.
 */
import { vectorSearch } from './vector-store';
import { webSearch, type FocusMode } from './web-search';
import type { FirestoreSource } from './schemas';

export type UnifiedSource = FirestoreSource & {
  domain?: string;
  url?: string;
  snippet?: string;
  isWeb?: boolean;
};

export type HybridSearchResult = {
  sources: UnifiedSource[];
  contextString: string;
};

/**
 * Executes hybrid retrieval across local vector DB and live web.
 */
export async function hybridSearch(
  query: string,
  focusMode: FocusMode = 'All',
  isProMode = false
): Promise<HybridSearchResult> {
  const sources: UnifiedSource[] = [];
  let contextString = '';

  try {
    // 1. Fire parallel searches (Local Vector + Live Web)
    const [vectorResults, webResults] = await Promise.all([
      // Only hit vector DB if not strictly 'Web' focus
      focusMode !== 'Web' ? vectorSearch(query, 4) : Promise.resolve([]),
      // Only hit web if not strictly 'Academic' (unless we implement academic web routing, which we did in webSearch)
      webSearch(
        query,
        focusMode,
        isProMode ? 6 : 3 // Pro gets more web results
      ),
    ]);

    // 2. Format Vector Results
    vectorResults.forEach((res) => {
      const srcId = sources.length + 1;
      const title = res.doc.filename?.replace(/\.[^/.]+$/, '') ?? `Doc ${srcId}`;
      
      sources.push({
        id: srcId,
        title,
        relevance: (res.score * 100).toFixed(0),
        snippet: res.doc.content.substring(0, 150) + '...',
        isWeb: false,
      });
      contextString += `\n[${srcId}] [Internal PDF/Doc: ${title}]\n${res.doc.content}\n`;
    });

    // 3. Format Web Results
    webResults.forEach((res) => {
      // Deduplicate domains slightly if we have many
      const isDuplicateDomain = sources.filter(s => s.domain === res.domain).length >= 2;
      if (isDuplicateDomain && !isProMode) return;

      const srcId = sources.length + 1;
      sources.push({
        id: srcId,
        title: res.title,
        url: res.url,
        domain: res.domain,
        relevance: Math.round(res.score * 100).toString(),
        snippet: res.content.substring(0, 150) + '...',
        isWeb: true,
      });
      contextString += `\n[${srcId}] [Web: ${res.domain} - ${res.title}]\nURL: ${res.url}\nExcerpt: ${res.content}\n`;
    });

  } catch (error) {
    console.error('[HybridSearch] Error during combined retrieval:', error);
  }

  return { sources, contextString: contextString.trim() };
}
