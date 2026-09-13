import assert from 'node:assert/strict';
import test from 'node:test';
import { OKMDProvider } from './okmdProvider';

test('sends an OpenAI-compatible chat request with the server-side bearer key', async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;

  globalThis.fetch = async (url, init) => {
    capturedUrl = String(url);
    capturedInit = init;
    return new Response(
      JSON.stringify({
        id: 'test-id',
        model: 'gemini-2.5-flash-lite',
        choices: [],
        usage: { prompt_tokens: 3, completion_tokens: 5, total_tokens: 8 },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  try {
    const provider = new OKMDProvider({
      apiKey: 'test-secret',
      baseUrl: 'https://gen.ai.kku.ac.th/okmd/api/v1',
    });
    const result = await provider.chat({
      messages: [{ role: 'user', content: 'hello' }],
      stream: false,
    });

    assert.equal(capturedUrl, 'https://gen.ai.kku.ac.th/okmd/api/v1/chat/completions');
    assert.equal(
      (capturedInit?.headers as Record<string, string>).Authorization,
      'Bearer test-secret',
    );
    assert.equal(result.usage?.total_tokens, 8);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('discovers the authoritative OKMD model catalog server-side', async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;

  globalThis.fetch = async (url, init) => {
    capturedUrl = String(url);
    capturedInit = init;
    return new Response(
      JSON.stringify({
        object: 'list',
        data: [
          { id: 1, object: 'model', owned_by: 'claude-sonnet-4' },
          { id: 2, object: 'model', owned_by: 'gpt-5' },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  try {
    const provider = new OKMDProvider({
      apiKey: 'test-secret',
      baseUrl: 'https://gen.ai.kku.ac.th/okmd/api/v1',
    });
    const models = await provider.listModels();

    assert.equal(capturedUrl, 'https://gen.ai.kku.ac.th/okmd/api/v1/models');
    assert.equal(
      (capturedInit?.headers as Record<string, string>).Authorization,
      'Bearer test-secret',
    );
    assert.deepEqual(models, [
      { id: '1', name: 'claude-sonnet-4', ownedBy: 'claude-sonnet-4' },
      { id: '2', name: 'gpt-5', ownedBy: 'gpt-5' },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rejects non-HTTPS provider URLs', () => {
  assert.throws(
    () => new OKMDProvider({ apiKey: 'test-secret', baseUrl: 'http://example.test/api/v1' }),
    /must use HTTPS/,
  );
});

test('fails closed when the API key is missing', () => {
  assert.throws(() => new OKMDProvider({ apiKey: '' }), /OKMD_AI_API_KEY is missing/);
});
