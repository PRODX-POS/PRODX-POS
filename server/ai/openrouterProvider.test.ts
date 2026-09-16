import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenRouterProvider } from './openrouterProvider';

test('sends an OpenAI-compatible chat request with the server-side bearer key', async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;

  globalThis.fetch = async (url, init) => {
    capturedUrl = String(url);
    capturedInit = init;
    return new Response(JSON.stringify({ id: 'test-id', model: 'openrouter/free', choices: [], usage: { prompt_tokens: 3, completion_tokens: 5, total_tokens: 8 } }), { status: 200 });
  };

  try {
    const provider = new OpenRouterProvider({ apiKey: 'test-secret' });
    const result = await provider.chat({ messages: [{ role: 'user', content: 'hello' }], stream: false });
    assert.equal(capturedUrl, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal((capturedInit?.headers as Record<string, string>).Authorization, 'Bearer test-secret');
    assert.equal(result.provider, 'openrouter');
    assert.equal(result.usage?.total_tokens, 8);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects non-HTTPS provider URLs', () => {
  assert.throws(() => new OpenRouterProvider({ apiKey: 'test-secret', baseUrl: 'http://example.test/api/v1' }), /must use HTTPS/);
});

test('fails closed when the API key is missing', () => {
  assert.throws(() => new OpenRouterProvider({ apiKey: '' }), /OPENROUTER_API_KEY is missing/);
});
