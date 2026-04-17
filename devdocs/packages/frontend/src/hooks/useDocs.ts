import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Repo {
  name: string;
  url: string;
}

export interface DocListItem {
  id: string;
  repo: string;
  path: string;
  title: string;
  type: 'markdown' | 'pdf';
  updatedAt: string;
  tags: string[];
}

export interface DocContent {
  html: string;
  raw: string;
}

export function useRepos() {
  return useQuery({
    queryKey: ['repos'],
    queryFn: () => api.get<Repo[]>('/api/repos'),
  });
}

export function useDocList() {
  return useQuery({
    queryKey: ['docs'],
    queryFn: () => api.get<DocListItem[]>('/api/docs'),
  });
}

export function useDoc(repo: string | undefined, docPath: string | undefined) {
  return useQuery({
    queryKey: ['doc', repo, docPath],
    queryFn: () => api.get<DocContent>(`/api/docs/${repo}/${docPath}`),
    enabled: Boolean(repo && docPath),
  });
}
