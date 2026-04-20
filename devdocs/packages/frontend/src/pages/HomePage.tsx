import { Link } from 'react-router-dom';
import { FolderOpen, RefreshCw, ArrowRight } from 'lucide-react';
import { useRepos } from '../hooks/useDocs';

export default function HomePage() {
  const { data: repos = [], isLoading } = useRepos();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        Documentation Portal
      </h1>
      <p className="mb-10 text-slate-500 dark:text-slate-400">
        Browse and search your team&apos;s documentation across all repositories.
      </p>

      {repos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400 dark:border-slate-700">
          <FolderOpen className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p>No repositories configured. Add REPO_1_URL / REPO_1_NAME to your .env file.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {repos.map((repo) => (
            <Link
              key={repo.name}
              to={`/docs/${repo.name}/README.md`}
              className="group flex items-start gap-4 rounded-xl border border-slate-200 p-5 transition-all hover:border-brand-400 hover:shadow-sm dark:border-slate-800 dark:hover:border-brand-600"
            >
              <FolderOpen className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{repo.name}</p>
                <p className="mt-1 truncate text-sm text-slate-400">{repo.url}</p>
              </div>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
