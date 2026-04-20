import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError } from '../../lib/api';

function mockFetch(ok: boolean, body: unknown, status = ok ? 200 : 404) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    statusText: ok ? 'OK' : 'Not Found',
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(true, {}));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api.get', () => {
  it('makes a GET request to the given path', async () => {
    vi.stubGlobal('fetch', mockFetch(true, { docs: [] }));
    await api.get('/api/docs');
    expect(fetch).toHaveBeenCalledWith(
      '/api/docs',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('returns the parsed JSON response body', async () => {
    vi.stubGlobal('fetch', mockFetch(true, { results: [{ id: '1' }], total: 1 }));
    const data = await api.get<{ results: { id: string }[]; total: number }>('/api/search?q=order');
    expect(data.total).toBe(1);
    expect(data.results[0]?.id).toBe('1');
  });

  it('throws ApiError with correct status on non-ok response', async () => {
    vi.stubGlobal('fetch', mockFetch(false, 'Document not found', 404));
    await expect(api.get('/api/docs/missing.md')).rejects.toBeInstanceOf(ApiError);
    try {
      await api.get('/api/docs/missing.md');
    } catch (e) {
      expect((e as ApiError).status).toBe(404);
    }
  });

  it('includes Content-Type: application/json header', async () => {
    vi.stubGlobal('fetch', mockFetch(true, {}));
    await api.get('/api/docs');
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
  });
});

describe('api.post', () => {
  it('makes a POST request with the correct method', async () => {
    vi.stubGlobal('fetch', mockFetch(true, { ok: true }));
    await api.post('/api/chat', { message: 'How do I cancel an order?' });
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.method).toBe('POST');
  });

  it('serialises the body as JSON', async () => {
    vi.stubGlobal('fetch', mockFetch(true, {}));
    const payload = { message: 'track order', history: [] };
    await api.post('/api/chat', payload);
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.body).toBe(JSON.stringify(payload));
  });

  it('returns the parsed JSON response body', async () => {
    vi.stubGlobal('fetch', mockFetch(true, { reply: 'Order is in transit.' }));
    const result = await api.post<{ reply: string }>('/api/chat', { message: 'status?' });
    expect(result.reply).toBe('Order is in transit.');
  });

  it('throws ApiError on non-ok POST response', async () => {
    vi.stubGlobal('fetch', mockFetch(false, 'Unauthorized', 401));
    await expect(api.post('/api/chat', {})).rejects.toBeInstanceOf(ApiError);
  });
});

describe('ApiError', () => {
  it('has name ApiError', () => {
    const err = new ApiError(500, 'Internal Server Error');
    expect(err.name).toBe('ApiError');
  });

  it('stores the HTTP status code', () => {
    const err = new ApiError(403, 'Forbidden');
    expect(err.status).toBe(403);
  });

  it('is an instance of Error', () => {
    expect(new ApiError(400, 'Bad Request')).toBeInstanceOf(Error);
  });
});
