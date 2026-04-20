import { describe, it, expect } from 'vitest';
import { cn } from '../../lib/utils';

describe('cn', () => {
  it('combines two class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles a single class name', () => {
    expect(cn('only')).toBe('only');
  });

  it('ignores falsy values', () => {
    expect(cn('base', false && 'gone', undefined, null, 'kept')).toBe('base kept');
  });

  it('ignores empty strings', () => {
    expect(cn('a', '', 'b')).toBe('a b');
  });

  it('deduplicates conflicting Tailwind utility classes (last one wins)', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('keeps non-conflicting Tailwind utilities together', () => {
    const result = cn('p-4', 'text-sm');
    expect(result).toContain('p-4');
    expect(result).toContain('text-sm');
  });

  it('handles conditional class objects', () => {
    const active = true;
    const disabled = false;
    const result = cn('btn', { 'btn-active': active, 'btn-disabled': disabled });
    expect(result).toContain('btn-active');
    expect(result).not.toContain('btn-disabled');
  });

  it('returns an empty string when no arguments are passed', () => {
    expect(cn()).toBe('');
  });
});
