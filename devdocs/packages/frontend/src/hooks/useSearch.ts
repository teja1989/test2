import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface SearchResult {
  id: string;
  repo: string;
  path: string;
  title: string;
  type: 'markdown' | 'pdf';
  highlights: string[];
  score: number | null;
}

export interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
}

export function useSearch(query: string, repo?: string) {
  const params = new URLSearchParams({ q: query });
  if (repo) params.set('repo', repo);

  return useQuery({
    queryKey: ['search', query, repo],
    queryFn: () => api.get<SearchResponse>(`/api/search?${params.toString()}`),
    enabled: query.trim().length > 0,
    staleTime: 1000 * 30,
  });
}
