import { NavLink } from 'react-router-dom';
import { BookOpen, FolderOpen, Home } from 'lucide-react';
import { useRepos } from '../hooks/useDocs';
import { useDocList } from '../hooks/useDocs';
import { cn } from '../lib/utils';

export default function Sidebar() {
  const { data: repos = [] } = useRepos();
  const { data: docs = [] } = useDocList();

  const docsByRepo = repos.reduce<Record<string, typeof docs>>(
    (acc, repo) => ({
      ...acc,
      [repo.name]: docs.filter((d) => d.repo === repo.name),
    }),
    {},
  );

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800">
      <div className="flex h-14 items-center gap-2 px-4 font-semibold text-brand-600 dark:text-brand-400">
        <BookOpen className="h-5 w-5" />
        DevDocs
      </div>

      <nav className="flex-1 overflow-auto p-2 text-sm">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-md px-3 py-2 transition-colors',
              isActive
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
            )
          }
        >
          <Home className="h-4 w-4" />
          Home
        </NavLink>

        {repos.map((repo) => (
          <div key={repo.name} className="mt-4">
            <p className="mb-1 flex items-center gap-1.5 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <FolderOpen className="h-3 w-3" />
              {repo.name}
            </p>
            {(docsByRepo[repo.name] ?? []).slice(0, 20).map((doc) => (
              <NavLink
                key={doc.id}
                to={`/docs/${doc.repo}/${doc.path}`}
                className={({ isActive }) =>
                  cn(
                    'block truncate rounded-md px-3 py-1.5 text-xs transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
                  )
                }
              >
                {doc.title}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
