import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenRouterProvider } from './openrouterProvider';

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

test('sends a server-side bearer request to OpenRouter', async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedHeaders: HeadersInit | undefined;
  let capturedBody = '';
  globalThis.fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedHeaders = init?.headers;
    capturedBody = String(init?.body ?? '');
    return response({ id: 'or-1', model: 'test-model', choices: [{ message: { role: 'assistant', content: 'OK' } }], usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 } });
  };
  try {
    const provider = new OpenRouterProvider({ apiKey: 'test-secret', defaultModel: 'test-model' });
    const result = await provider.chat({ messages: [{ role: 'user', content: 'hello' }] });
    assert.equal(provider.name, 'openrouter');
    assert.equal(capturedUrl, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(new Headers(capturedHeaders).get('authorization'), 'Bearer test-secret');
    assert.equal(JSON.parse(capturedBody).model, 'test-model');
    assert.equal(result.provider, 'openrouter');
    assert.equal(result.choices?.length, 1);
    assert.equal(result.usage?.total_tokens, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects insecure custom base URLs', () => {
  assert.throws(() => new OpenRouterProvider({ apiKey: 'test-secret', baseUrl: 'http://localhost:3000' }), /HTTPS/);
});

test('requires an API key', () => {
  assert.throws(() => new OpenRouterProvider({ apiKey: '' }), /OPENROUTER_API_KEY is missing/);
});
