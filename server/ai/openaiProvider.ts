import { AIChatRequest, AIChatResponse, AIProvider } from './types';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-5.6-luna';
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_MESSAGES = 50;
const MAX_MESSAGE_CHARS = 20_000;

export interface OpenAIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  timeoutMs?: number;
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:') {
    throw new Error('OpenAI AI base URL must use HTTPS.');
  }
  return url.toString().replace(/\/$/, '');
}

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly timeoutMs: number;

  constructor(config: OpenAIProviderConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.OPENAI_API_KEY ?? '';
    this.baseUrl = normalizeBaseUrl(
      config.baseUrl ?? process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL,
    );
    this.defaultModel =
      config.defaultModel ?? process.env.OPENAI_DEFAULT_MODEL ?? DEFAULT_MODEL;
    this.timeoutMs = Math.max(
      1_000,
      Number(config.timeoutMs ?? process.env.OPENAI_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS),
    );

    if (!this.apiKey) {
      throw new Error('OpenAI AI is not configured: OPENAI_API_KEY is missing.');
    }
  }

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    this.validateRequest(request);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/responses`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model ?? this.defaultModel,
          input: request.messages.map((message) => ({
            role: message.role,
            content: [{ type: 'input_text', text: message.content }],
          })),
          ...(request.max_tokens === undefined
            ? {}
            : { max_output_tokens: request.max_tokens }),
          ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Never copy provider response bodies or authorization headers into errors/logs.
        throw new Error(`OpenAI AI request failed (${response.status}).`);
      }

      const raw = (await response.json()) as Record<string, unknown>;
      const usage = raw.usage as Record<string, unknown> | undefined;

      return {
        id: typeof raw.id === 'string' ? raw.id : undefined,
        model: typeof raw.model === 'string' ? raw.model : request.model ?? this.defaultModel,
        choices: undefined,
        usage: usage
          ? {
              prompt_tokens:
                typeof usage.input_tokens === 'number' ? usage.input_tokens : undefined,
              completion_tokens:
                typeof usage.output_tokens === 'number' ? usage.output_tokens : undefined,
              total_tokens:
                typeof usage.total_tokens === 'number' ? usage.total_tokens : undefined,
            }
          : undefined,
        provider: this.name,
        raw,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`OpenAI AI request timed out after ${this.timeoutMs}ms.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private validateRequest(request: AIChatRequest): void {
    if (!Array.isArray(request.messages) || request.messages.length === 0) {
      throw new Error('AI request must contain at least one message.');
    }
    if (request.messages.length > MAX_MESSAGES) {
      throw new Error(`AI request exceeds the ${MAX_MESSAGES}-message limit.`);
    }
    for (const message of request.messages) {
      if (!message.content.trim() || message.content.length > MAX_MESSAGE_CHARS) {
        throw new Error('AI message content is empty or exceeds the allowed size.');
      }
    }
    if (request.stream) {
      throw new Error('OpenAI provider does not support streaming through this boundary yet.');
    }
    if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
      throw new Error('AI temperature must be between 0 and 2.');
    }
    if (
      request.max_tokens !== undefined &&
      (!Number.isInteger(request.max_tokens) || request.max_tokens < 1)
    ) {
      throw new Error('AI max_tokens must be a positive integer.');
    }
  }
}
