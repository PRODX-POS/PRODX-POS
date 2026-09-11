import type { AIChatRequest, AIChatResponse, AIMessage, AIProvider } from './types';

const DEFAULT_MAX_REQUEST_CHARS = 40_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 2_000;
const DEFAULT_MAX_ESTIMATED_INPUT_TOKENS = 10_000;

export type AIScope = {
  readonly userId: string;
  readonly organizationId: string;
  readonly storeId: string;
};

export type AIAuditEvent = {
  readonly action: 'chat';
  readonly requestId: string;
  readonly userId: string;
  readonly organizationId: string;
  readonly storeId: string;
  readonly provider: string;
  readonly model?: string;
  readonly inputChars: number;
  readonly estimatedInputTokens: number;
  readonly outputTokens?: number;
  readonly allowed: boolean;
  readonly reason?: string;
};

export type AIGatewayPolicy = {
  readonly permission: string;
  readonly maxRequestChars?: number;
  readonly maxOutputTokens?: number;
  readonly maxEstimatedInputTokens?: number;
};

export type AIGatewayRequest = {
  readonly requestId: string;
  readonly scope: AIScope;
  readonly permission: string;
  readonly messages: readonly AIMessage[];
  readonly provider?: string;
  readonly model?: string;
  readonly temperature?: number;
  readonly max_tokens?: number;
};

export interface AIAuthorizer {
  authorize(scope: AIScope, permission: string): Promise<boolean> | boolean;
}

export interface AIAuditor {
  record(event: AIAuditEvent): Promise<void> | void;
}

export interface AIProviderRegistry {
  get(name?: string): AIProvider;
}

export class AIGatewayService {
  private readonly policy: Required<AIGatewayPolicy>;

  constructor(
    private readonly registry: AIProviderRegistry,
    private readonly authorizer: AIAuthorizer,
    private readonly auditor: AIAuditor,
    policy: AIGatewayPolicy,
  ) {
    this.policy = {
      permission: policy.permission,
      maxRequestChars: policy.maxRequestChars ?? DEFAULT_MAX_REQUEST_CHARS,
      maxOutputTokens: policy.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
      maxEstimatedInputTokens:
        policy.maxEstimatedInputTokens ?? DEFAULT_MAX_ESTIMATED_INPUT_TOKENS,
    };
  }

  async chat(request: AIGatewayRequest): Promise<AIChatResponse> {
    this.validateEnvelope(request);
    const inputChars = request.messages.reduce((sum, message) => sum + message.content.length, 0);
    const estimatedInputTokens = estimateTokens(request.messages);

    if (!(await this.authorizer.authorize(request.scope, this.policy.permission))) {
      await this.audit({
        request,
        provider: request.provider ?? 'unresolved',
        inputChars,
        estimatedInputTokens,
        allowed: false,
        reason: 'permission_denied',
      });
      throw new Error('AI capability is not authorized.');
    }

    if (estimatedInputTokens > this.policy.maxEstimatedInputTokens) {
      await this.audit({
        request,
        provider: request.provider ?? 'unresolved',
        inputChars,
        estimatedInputTokens,
        allowed: false,
        reason: 'input_budget_exceeded',
      });
      throw new Error('AI request exceeds the configured input budget.');
    }

    const provider = this.registry.get(request.provider);
    const maxTokens = Math.min(
      request.max_tokens ?? this.policy.maxOutputTokens,
      this.policy.maxOutputTokens,
    );

    // External/business data is explicitly marked as untrusted context. It must never
    // become an instruction with higher authority than the gateway policy.
    const providerRequest: AIChatRequest = {
      model: request.model,
      messages: buildProviderMessages(request.messages),
      stream: false,
      temperature: request.temperature,
      max_tokens: maxTokens,
    };

    const response = await provider.chat(providerRequest);
    await this.audit({
      request,
      provider: provider.name,
      model: response.model ?? request.model,
      inputChars,
      estimatedInputTokens,
      outputTokens: response.usage?.completion_tokens,
      allowed: true,
    });
    return response;
  }

  private async audit(base: {
    request: AIGatewayRequest;
    provider: string;
    model?: string;
    inputChars: number;
    estimatedInputTokens: number;
    outputTokens?: number;
    allowed: boolean;
    reason?: string;
  }): Promise<void> {
    await this.auditor.record({
      action: 'chat',
      requestId: base.request.requestId,
      userId: base.request.scope.userId,
      organizationId: base.request.scope.organizationId,
      storeId: base.request.scope.storeId,
      provider: base.provider,
      model: base.model,
      inputChars: base.inputChars,
      estimatedInputTokens: base.estimatedInputTokens,
      outputTokens: base.outputTokens,
      allowed: base.allowed,
      reason: base.reason,
    });
  }

  private validateEnvelope(request: AIGatewayRequest): void {
    if (!request.requestId.trim()) throw new Error('AI requestId is required.');
    if (!request.scope.userId || !request.scope.organizationId || !request.scope.storeId) {
      throw new Error('AI organization/store/user scope is required.');
    }
    if (!request.permission || request.permission !== this.policy.permission) {
      throw new Error('AI permission does not match the configured capability.');
    }
    if (!Array.isArray(request.messages) || request.messages.length === 0) {
      throw new Error('AI request must contain at least one message.');
    }
    const chars = request.messages.reduce((sum, message) => sum + message.content.length, 0);
    if (chars > this.policy.maxRequestChars) {
      throw new Error('AI request exceeds the configured request size.');
    }
    if (request.max_tokens !== undefined && (!Number.isInteger(request.max_tokens) || request.max_tokens < 1)) {
      throw new Error('AI max_tokens must be a positive integer.');
    }
  }
}

function estimateTokens(messages: readonly AIMessage[]): number {
  // Conservative pre-provider budget estimate. Provider usage remains authoritative for billing.
  const chars = messages.reduce((sum, message) => sum + message.content.length, 0);
  return Math.ceil(chars / 4);
}

function buildProviderMessages(messages: readonly AIMessage[]): readonly AIMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content:
      message.role === 'system'
        ? message.content
        : `[UNTRUSTED_USER_OR_BUSINESS_CONTEXT]\n${message.content}\n[/UNTRUSTED_USER_OR_BUSINESS_CONTEXT]`,
  }));
}
