import { useState, useCallback, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, FileText } from 'lucide-react';
import { cn } from '../lib/utils';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface Props {
  url: string;
  className?: string;
}

export default function PdfViewer({ url, className }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [fitWidth, setFitWidth] = useState(true);
  const [pageInput, setPageInput] = useState('1');
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Track container width for fit-to-width mode
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        setPage((p) => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        setPage((p) => Math.min(numPages, p + 1));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [numPages]);

  // Keep page input in sync when page changes
  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const onLoad = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPage(1);
  }, []);

  const onError = useCallback((e: Error) => setError(e.message), []);

  const commitPageInput = () => {
    const n = parseInt(pageInput, 10);
    if (!isNaN(n) && n >= 1 && n <= numPages) {
      setPage(n);
    } else {
      setPageInput(String(page));
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
        <FileText className="h-10 w-10 opacity-40" />
        <p className="text-sm">Failed to load PDF: {error}</p>
        <a href={url} target="_blank" rel="noreferrer" className="text-brand-500 underline text-sm">
          Open in new tab
        </a>
      </div>
    );
  }

  const pageWidth = fitWidth && containerWidth > 0 ? containerWidth - 2 : undefined;
  const pageScale = fitWidth ? undefined : scale;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {/* Page navigation */}
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="rounded p-1 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Previous page (←)"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
          <input
            type="text"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={commitPageInput}
            onKeyDown={(e) => e.key === 'Enter' && commitPageInput()}
            className="w-10 rounded border border-slate-200 bg-transparent px-1 py-0.5 text-center text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-600"
            aria-label="Page number"
          />
          <span className="opacity-60">/ {numPages || '—'}</span>
        </div>

        <button
          onClick={() => setPage((p) => Math.min(numPages, p + 1))}
          disabled={page >= numPages}
          className="rounded p-1 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Next page (→)"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        {/* Fit-to-width toggle */}
        <button
          onClick={() => setFitWidth((f) => !f)}
          className={cn(
            'rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800',
            fitWidth && 'bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400',
          )}
          title="Fit to width"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        {/* Zoom controls — only visible when not in fit-width mode */}
        {!fitWidth && (
          <>
            <button
              onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(1)))}
              className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <span className="min-w-[3rem] text-center text-xs text-slate-400">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(1)))}
              className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
          </>
        )}

        <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <a href={url} download className="text-xs text-brand-500 hover:underline">
          Download
        </a>
      </div>

      {/* PDF canvas */}
      <div ref={containerRef} className="w-full overflow-x-auto">
        <Document
          file={url}
          onLoadSuccess={onLoad}
          onLoadError={onError}
          loading={
            <div className="flex h-64 items-center justify-center text-slate-400">
              Loading PDF…
            </div>
          }
        >
          <Page
            pageNumber={page}
            width={pageWidth}
            scale={pageScale}
            renderTextLayer
            renderAnnotationLayer
            className="mx-auto shadow-lg"
          />
        </Document>
      </div>
    </div>
  );
}
