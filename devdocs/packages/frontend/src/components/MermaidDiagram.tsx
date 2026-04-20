import { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useAppStore } from '../lib/store';

interface Props {
  code: string;
}

export default function MermaidDiagram({ code }: Props) {
  const { darkMode } = useAppStore();
  const uid = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: darkMode ? 'dark' : 'default',
      securityLevel: 'strict',
      fontFamily: 'Inter, system-ui, sans-serif',
    });

    setError(null);

    mermaid
      .render(`mermaid-${uid}`, code)
      .then(({ svg }) => {
        if (containerRef.current) containerRef.current.innerHTML = svg;
      })
      .catch((e: Error) => setError(e.message));
  }, [code, uid, darkMode]);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
        <p className="text-xs font-semibold text-red-600 dark:text-red-400">Mermaid parse error</p>
        <pre className="mt-1 whitespace-pre-wrap text-xs text-red-500 dark:text-red-400">
          {error}
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-6 flex justify-center overflow-x-auto rounded-lg bg-slate-50 p-4 dark:bg-slate-900"
    />
  );
}
