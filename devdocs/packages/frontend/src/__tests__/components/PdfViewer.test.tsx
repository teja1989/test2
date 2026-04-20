import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// Capture callbacks so tests can trigger them
let capturedOnLoadSuccess: ((data: { numPages: number }) => void) | undefined;
let capturedOnLoadError: ((e: Error) => void) | undefined;

vi.mock('react-pdf', () => ({
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
  Document: vi.fn(({ children, onLoadSuccess, onLoadError }: any) => {
    capturedOnLoadSuccess = onLoadSuccess;
    capturedOnLoadError = onLoadError;
    return <div data-testid="pdf-document">{children}</div>;
  }),
  Page: vi.fn(({ pageNumber }: any) => (
    <div data-testid="pdf-page">Page {pageNumber}</div>
  )),
}));

import PdfViewer from '../../components/PdfViewer';

const TEST_URL = '/api/docs/oms-docs/reports/order-summary.pdf';

function renderAndLoad(numPages = 5) {
  const result = render(<PdfViewer url={TEST_URL} />);
  act(() => {
    capturedOnLoadSuccess?.({ numPages });
  });
  return result;
}

beforeEach(() => {
  capturedOnLoadSuccess = undefined;
  capturedOnLoadError = undefined;
  vi.clearAllMocks();
});

describe('PdfViewer — toolbar controls', () => {
  it('renders prev and next page buttons', () => {
    renderAndLoad();
    expect(screen.getByTitle('Previous page (←)')).toBeInTheDocument();
    expect(screen.getByTitle('Next page (→)')).toBeInTheDocument();
  });

  it('renders a fit-to-width toggle button', () => {
    renderAndLoad();
    expect(screen.getByTitle('Fit to width')).toBeInTheDocument();
  });

  it('renders a download link pointing to the PDF URL', () => {
    renderAndLoad();
    const link = screen.getByText('Download');
    expect(link).toHaveAttribute('href', TEST_URL);
  });

  it('renders a page number input', () => {
    renderAndLoad();
    expect(screen.getByRole('textbox', { name: /page number/i })).toBeInTheDocument();
  });
});

describe('PdfViewer — page count', () => {
  it('shows the total page count after document loads', () => {
    renderAndLoad(10);
    expect(screen.getByText('/ 10')).toBeInTheDocument();
  });

  it('shows — as page count before document loads', () => {
    render(<PdfViewer url={TEST_URL} />);
    expect(screen.getByText('/ —')).toBeInTheDocument();
  });
});

describe('PdfViewer — navigation', () => {
  it('prev button is disabled on the first page', () => {
    renderAndLoad();
    expect(screen.getByTitle('Previous page (←)')).toBeDisabled();
  });

  it('next button is disabled on the last page', () => {
    renderAndLoad(1);
    expect(screen.getByTitle('Next page (→)')).toBeDisabled();
  });

  it('clicking next increments the page number', () => {
    renderAndLoad();
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: /page number/i });
    expect(input.value).toBe('1');
    fireEvent.click(screen.getByTitle('Next page (→)'));
    expect(input.value).toBe('2');
  });

  it('clicking prev decrements the page number', () => {
    renderAndLoad(5);
    // Advance to page 3 first
    fireEvent.click(screen.getByTitle('Next page (→)'));
    fireEvent.click(screen.getByTitle('Next page (→)'));
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: /page number/i });
    expect(input.value).toBe('3');
    fireEvent.click(screen.getByTitle('Previous page (←)'));
    expect(input.value).toBe('2');
  });

  it('page jump input navigates on Enter', () => {
    renderAndLoad(10);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: /page number/i });
    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input.value).toBe('7');
  });

  it('page jump input reverts to current page on invalid input', () => {
    renderAndLoad(5);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: /page number/i });
    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.blur(input);
    expect(input.value).toBe('1');
  });

  it('page jump input reverts on non-numeric input', () => {
    renderAndLoad(5);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: /page number/i });
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.blur(input);
    expect(input.value).toBe('1');
  });
});

describe('PdfViewer — zoom', () => {
  it('zoom controls are hidden in fit-to-width mode (default)', () => {
    renderAndLoad();
    expect(screen.queryByTitle('Zoom in')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Zoom out')).not.toBeInTheDocument();
  });

  it('zoom controls appear after toggling fit-to-width off', () => {
    renderAndLoad();
    fireEvent.click(screen.getByTitle('Fit to width'));
    expect(screen.getByTitle('Zoom in')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom out')).toBeInTheDocument();
  });

  it('clicking zoom in shows an increased percentage', () => {
    renderAndLoad();
    fireEvent.click(screen.getByTitle('Fit to width')); // turn off fit-width
    const before = screen.getByText(/\d+%/);
    const valueBefore = parseInt(before.textContent ?? '0');
    fireEvent.click(screen.getByTitle('Zoom in'));
    const valueAfter = parseInt(screen.getByText(/\d+%/).textContent ?? '0');
    expect(valueAfter).toBeGreaterThan(valueBefore);
  });
});

describe('PdfViewer — error state', () => {
  it('shows an error message when the PDF fails to load', () => {
    render(<PdfViewer url={TEST_URL} />);
    act(() => {
      capturedOnLoadError?.(new Error('corrupt or missing PDF'));
    });
    expect(screen.getByText(/Failed to load PDF/)).toBeInTheDocument();
  });

  it('shows a fallback link to open the PDF in a new tab on error', () => {
    render(<PdfViewer url={TEST_URL} />);
    act(() => {
      capturedOnLoadError?.(new Error('network error'));
    });
    const link = screen.getByText('Open in new tab');
    expect(link).toHaveAttribute('href', TEST_URL);
    expect(link).toHaveAttribute('target', '_blank');
  });
});
