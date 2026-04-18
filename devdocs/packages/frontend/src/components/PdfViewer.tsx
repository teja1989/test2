import { useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileText } from 'lucide-react';
import { cn } from '../lib/utils';

// Vite-friendly worker resolution
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
  const [scale, setScale] = useState(1.2);
  const [error, setError] = useState<string | null>(null);

  const onLoad = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPage(1);
  }, []);

  const onError = useCallback((e: Error) => setError(e.message), []);

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

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Controls */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="rounded p-1 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[80px] text-center text-sm text-slate-600 dark:text-slate-400">
          {page} / {numPages || '—'}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(numPages, p + 1))}
          disabled={page >= numPages}
          className="rounded p-1 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />
        <button
          onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(1)))}
          className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <span className="text-xs text-slate-400">{Math.round(scale * 100)}%</span>
        <button
          onClick={() => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(1)))}
          className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <div className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />
        <a
          href={url}
          download
          className="text-xs text-brand-500 hover:underline"
        >
          Download
        </a>
      </div>

      {/* Document */}
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
          scale={scale}
          renderTextLayer
          renderAnnotationLayer
          className="shadow-lg"
        />
      </Document>
    </div>
  );
}
