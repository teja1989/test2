import { Moon, Sun, PanelLeft, LogOut, User } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import SearchBar from './SearchBar';
import { useAppStore } from '../lib/store';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

export default function TopBar() {
  const { darkMode, toggleDarkMode, setSidebarOpen, sidebarOpen } = useAppStore();
  const { user, isSsoEnabled } = useAuth();

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

      {/* User menu — only shown when SSO is active */}
      {isSsoEnabled && user && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1 text-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              aria-label="User menu"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {user.name?.charAt(0).toUpperCase() ?? <User className="h-3 w-3" />}
              </div>
              <span className="hidden max-w-[120px] truncate text-slate-700 dark:text-slate-300 sm:block">
                {user.name}
              </span>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-[180px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
              <DropdownMenu.Item asChild>
                <a
                  href="/api/auth/logout"
                  className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 outline-none hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </a>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </header>
  );
}
