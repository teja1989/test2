import { Link, useSearchParams } from 'react-router-dom';
import { FileText, RefreshCw, SearchX } from 'lucide-react';
import { useSearch } from '../hooks/useSearch';

function PdfIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 13v-1h6v1" />
      <path d="M11 18h2" />
      <path d="M12 12v6" />
    </svg>
  );
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const { data, isLoading } = useSearch(query);

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-slate-100">
        Results for{' '}
        <span className="text-brand-600 dark:text-brand-400">&#34;{query}&#34;</span>
        {data && (
          <span className="ml-2 text-sm font-normal text-slate-400">
            ({data.total} found)
          </span>
        )}
      </h2>

      {isLoading && (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      )}

      {!isLoading && data?.results.length === 0 && (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <SearchX className="mb-3 h-10 w-10 opacity-40" />
          <p>No results found for &ldquo;{query}&rdquo;.</p>
        </div>
      )}

      <ul className="space-y-3">
        {data?.results.map((result) => (
          <li key={result.id}>
            <Link
              to={`/docs/${result.repo}/${result.path}`}
              className="block rounded-xl border border-slate-200 p-4 transition-all hover:border-brand-400 hover:shadow-sm dark:border-slate-800 dark:hover:border-brand-600"
            >
              <div className="flex items-center gap-2">
                {result.type === 'pdf' ? (
                  <PdfIcon className="h-4 w-4 shrink-0 text-red-400" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-brand-500" />
                )}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {result.title}
                </span>
                <span className="ml-auto shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {result.repo}
                </span>
              </div>
              {result.highlights[0] && (
                <p
                  className="mt-2 line-clamp-3 text-sm text-slate-500 dark:text-slate-400 [&_mark]:rounded [&_mark]:bg-brand-100 [&_mark]:px-0.5 [&_mark]:text-brand-800 dark:[&_mark]:bg-brand-900 dark:[&_mark]:text-brand-200"
                  dangerouslySetInnerHTML={{ __html: result.highlights[0] }}
                />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
