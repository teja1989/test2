import { Moon, Sun, PanelLeft } from 'lucide-react';
import SearchBar from './SearchBar';
import { useAppStore } from '../lib/store';
import { cn } from '../lib/utils';

export default function TopBar() {
  const { darkMode, toggleDarkMode, setSidebarOpen, sidebarOpen } = useAppStore();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={cn(
          'rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800',
        )}
        aria-label="Toggle sidebar"
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      <div className="flex-1">
        <SearchBar />
      </div>

      <button
        onClick={toggleDarkMode}
        className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Toggle dark mode"
      >
        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </header>
  );
}
