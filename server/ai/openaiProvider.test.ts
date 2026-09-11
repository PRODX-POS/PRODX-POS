import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenAIProvider } from './openaiProvider';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

test('OpenAI provider calls Responses API without exposing the API key', async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedInit: RequestInit | undefined;

  globalThis.fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return jsonResponse({
      id: 'resp_test',
      model: 'gpt-5.6-luna',
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: 'Sales are up 12%.' }],
        },
      ],
      usage: { input_tokens: 10, output_tokens: 4, total_tokens: 14 },
    });
  };

  try {
    const provider = new OpenAIProvider({
      apiKey: 'test-secret',
      defaultModel: 'gpt-5.6-luna',
      timeoutMs: 5_000,
    });

    const result = await provider.chat({
      messages: [{ role: 'user', content: "Summarize today's sales." }],
      max_tokens: 200,
    });

    assert.equal(provider.name, 'openai');
    assert.equal(capturedUrl, 'https://api.openai.com/v1/responses');
    assert.equal(result.id, 'resp_test');
    assert.deepEqual(result.usage, {
      prompt_tokens: 10,
      completion_tokens: 4,
      total_tokens: 14,
    });
    assert.deepEqual(result.choices, [
      {
        index: 0,
        message: { role: 'assistant', content: 'Sales are up 12%.' },
        finish_reason: 'stop',
      },
    ]);

    const headers = capturedInit?.headers as Record<string, string>;
    assert.equal(headers.Authorization, 'Bearer test-secret');

    const body = JSON.parse(String(capturedInit?.body)) as Record<string, unknown>;
    assert.equal(body.model, 'gpt-5.6-luna');
    assert.deepEqual(body.input, [
      {
        role: 'user',
        content: [{ type: 'input_text', text: "Summarize today's sales." }],
      },
    ]);
    assert.equal(body.max_output_tokens, 200);
    assert.equal(JSON.stringify(body).includes('test-secret'), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenAI provider rejects streaming until the boundary explicitly supports it', async () => {
  const provider = new OpenAIProvider({ apiKey: 'test-secret' });

  await assert.rejects(
    provider.chat({
      stream: true,
      messages: [{ role: 'user', content: 'Hello' }],
    }),
    /does not support streaming/,
  );
});

test('OpenAI provider rejects non-HTTPS endpoints', () => {
  assert.throws(
    () => new OpenAIProvider({ apiKey: 'test-secret', baseUrl: 'http://example.test/v1' }),
    /must use HTTPS/,
  );
});

test('OpenAI provider rejects missing API keys', () => {
  assert.throws(
    () => new OpenAIProvider({ apiKey: '' }),
    /OPENAI_API_KEY is missing/,
  );
});

test('OpenAI provider does not copy provider error bodies into thrown errors', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ secret: 'provider-sensitive-body' }, 401);

  try {
    const provider = new OpenAIProvider({ apiKey: 'test-secret' });
    await assert.rejects(provider.chat({ messages: [{ role: 'user', content: 'Hello' }] }), (error) => {
      assert.match(String(error), /OpenAI AI request failed \(401\)/);
      assert.equal(String(error).includes('provider-sensitive-body'), false);
      assert.equal(String(error).includes('test-secret'), false);
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
