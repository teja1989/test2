import { useParams } from 'react-router-dom';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useDoc } from '../hooks/useDocs';
import DocViewer from '../components/DocViewer';
import PdfViewer from '../components/PdfViewer';

export default function DocPage() {
  const params = useParams<{ repo: string; '*': string }>();
  const repo = params.repo;
  const docPath = params['*'] ?? 'README.md';

  const isPdf = docPath.toLowerCase().endsWith('.pdf');

  // For PDFs we load via URL directly — no need to fetch raw content
  const { data, isLoading, error } = useDoc(
    isPdf ? undefined : repo,
    isPdf ? undefined : docPath,
  );

  if (isPdf) {
    return (
      <div className="w-full">
        <PdfViewer url={`/api/docs/${repo}/${docPath}`} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Failed to load document</p>
            <p className="mt-1 text-sm opacity-80">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <DocViewer content={data?.raw ?? ''} />
    </div>
  );
}
