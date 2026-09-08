import { afterEach, describe, expect, it, vi } from 'vitest';
import { OKMDProvider } from './okmdProvider';

// These tests document the provider contract. They require the repository's test
// runner to provide Vitest; no real provider credentials or network calls are used.
describe('OKMDProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends an OpenAI-compatible chat request with the server-side bearer key', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'test-id',
          model: 'gemini-2.5-flash-lite',
          choices: [],
          usage: { prompt_tokens: 3, completion_tokens: 5, total_tokens: 8 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const provider = new OKMDProvider({
      apiKey: 'test-secret',
      baseUrl: 'https://gen.ai.kku.ac.th/okmd/api/v1',
    });

    await provider.chat({
      messages: [{ role: 'user', content: 'hello' }],
      stream: false,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://gen.ai.kku.ac.th/okmd/api/v1/chat/completions');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-secret');
  });

  it('rejects non-HTTPS provider URLs', () => {
    expect(
      () => new OKMDProvider({ apiKey: 'test-secret', baseUrl: 'http://example.test/api/v1' }),
    ).toThrow('must use HTTPS');
  });

  it('fails closed when the API key is missing', () => {
    expect(() => new OKMDProvider({ apiKey: '' })).toThrow('OKMD_AI_API_KEY is missing');
  });
});
