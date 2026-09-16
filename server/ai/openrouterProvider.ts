import { AIChatRequest, AIChatResponse, AIProvider } from './types';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'openrouter/free';
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_MESSAGES = 50;
const MAX_MESSAGE_CHARS = 20_000;

export interface OpenRouterProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  timeoutMs?: number;
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:') {
    throw new Error('OpenRouter AI base URL must use HTTPS.');
  }
  return url.toString().replace(/\/$/, '');
}

export class OpenRouterProvider implements AIProvider {
  readonly name = 'openrouter';

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly timeoutMs: number;

  constructor(config: OpenRouterProviderConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.OPENROUTER_API_KEY ?? '';
    this.baseUrl = normalizeBaseUrl(
      config.baseUrl ?? process.env.OPENROUTER_BASE_URL ?? DEFAULT_BASE_URL,
    );
    this.defaultModel =
      config.defaultModel ?? process.env.OPENROUTER_DEFAULT_MODEL ?? DEFAULT_MODEL;
    this.timeoutMs = Math.max(
      1_000,
      Number(config.timeoutMs ?? process.env.OPENROUTER_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS),
    );

    if (!this.apiKey) {
      throw new Error('OpenRouter AI is not configured: OPENROUTER_API_KEY is missing.');
    }
  }

  async chat(request: AIChatRequest): Promise<AIChatResponse> {
    this.validateRequest(request);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'X-Title': 'PRODX-POS',
        },
        body: JSON.stringify({
          model: request.model ?? this.defaultModel,
          messages: request.messages,
          stream: request.stream ?? false,
          ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
          ...(request.max_tokens === undefined ? {} : { max_tokens: request.max_tokens }),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenRouter AI request failed (${response.status}).`);
      }

      const raw = (await response.json()) as Record<string, unknown>;
      const usage = raw.usage as Record<string, unknown> | undefined;
      return {
        id: typeof raw.id === 'string' ? raw.id : undefined,
        model: typeof raw.model === 'string' ? raw.model : request.model ?? this.defaultModel,
        choices: Array.isArray(raw.choices) ? raw.choices : undefined,
        usage: usage
          ? {
              prompt_tokens: typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : undefined,
              completion_tokens: typeof usage.completion_tokens === 'number' ? usage.completion_tokens : undefined,
              total_tokens: typeof usage.total_tokens === 'number' ? usage.total_tokens : undefined,
            }
          : undefined,
        provider: this.name,
        raw,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`OpenRouter AI request timed out after ${this.timeoutMs}ms.`);
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
      throw new Error('OpenRouter provider does not support streaming through this boundary yet.');
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
