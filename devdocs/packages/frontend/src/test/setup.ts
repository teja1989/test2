import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ResizeObserver is not available in jsdom
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// URL.createObjectURL not available in jsdom
global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
