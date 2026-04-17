import { type ReactNode, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAppStore } from '../lib/store';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { darkMode, sidebarOpen } = useAppStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface dark:bg-surface-dark">
      {sidebarOpen && <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
