import { AIChatRequest, AIChatResponse, AIMessage, AIProvider } from './types';

const DEFAULT_MAX_MESSAGES = 50;
const DEFAULT_MAX_MESSAGE_CHARS = 20_000;

export interface AICorePolicy {
  readonly maxMessages?: number;
  readonly maxMessageChars?: number;
  readonly allowedProviders?: readonly string[];
}

export interface AICoreRequest extends Omit<AIChatRequest, 'messages'> {
  messages: readonly AIMessage[];
  provider?: string;
}

export interface AIProviderRegistry {
  get(name?: string): AIProvider;
}

export class AICoreService {
  private readonly policy: Required<AICorePolicy>;

  constructor(
    private readonly registry: AIProviderRegistry,
    policy: AICorePolicy = {},
  ) {
    this.policy = {
      maxMessages: policy.maxMessages ?? DEFAULT_MAX_MESSAGES,
      maxMessageChars: policy.maxMessageChars ?? DEFAULT_MAX_MESSAGE_CHARS,
      allowedProviders: policy.allowedProviders ?? [],
    };
  }

  async chat(request: AICoreRequest): Promise<AIChatResponse> {
    this.validate(request);
    const provider = this.registry.get(request.provider);

    if (
      this.policy.allowedProviders.length > 0 &&
      !this.policy.allowedProviders.includes(provider.name)
    ) {
      throw new Error(`AI provider '${provider.name}' is not allowed by policy.`);
    }

    const providerRequest: AIChatRequest = {
      model: request.model,
      messages: request.messages,
      stream: request.stream ?? false,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
    };

    return provider.chat(providerRequest);
  }

  private validate(request: AICoreRequest): void {
    if (!Array.isArray(request.messages) || request.messages.length === 0) {
      throw new Error('AI Core request must contain at least one message.');
    }
    if (request.messages.length > this.policy.maxMessages) {
      throw new Error(`AI Core request exceeds the ${this.policy.maxMessages}-message limit.`);
    }
    for (const message of request.messages) {
      if (!message.content.trim() || message.content.length > this.policy.maxMessageChars) {
        throw new Error('AI Core message content is empty or exceeds the allowed size.');
      }
    }
  }
}

export function createAIProviderRegistry(
  providers: readonly AIProvider[],
  defaultProvider: string,
): AIProviderRegistry {
  const byName = new Map(providers.map((provider) => [provider.name, provider]));

  return {
    get(name = defaultProvider): AIProvider {
      const provider = byName.get(name);
      if (!provider) {
        throw new Error(`AI provider '${name}' is not configured.`);
      }
      return provider;
    },
  };
}
