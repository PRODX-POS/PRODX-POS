import { AIBackendBoundary, AIBackendPrincipal } from './backend-boundary';
import { AICapability, DEFAULT_AI_CAPABILITY_POLICY } from './capabilities';
import { AIChatResponse } from './types';

export interface AIProductionRequest {
  readonly principal: AIBackendPrincipal;
  readonly capability: AICapability;
  readonly model?: string;
  readonly messages: AIProductionMessage[];
  readonly stream?: boolean;
  readonly temperature?: number;
  readonly max_tokens?: number;
}

export interface AIProductionMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export interface AIRateLimiter {
  check(principal: AIBackendPrincipal): void | Promise<void>;
}

export interface AIAuditSink {
  record(event: {
    readonly userId: string;
    readonly organizationId: string;
    readonly storeId: string;
    readonly capability: AICapability;
    readonly outcome: 'success' | 'denied' | 'error';
  }): void | Promise<void>;
}

export class AICapabilityError extends Error {
  constructor(message = 'AI capability is not allowed.') {
    super(message);
    this.name = 'AICapabilityError';
  }
}

export class AIProductionBoundary {
  constructor(
    private readonly backend: AIBackendBoundary,
    private readonly rateLimiter?: AIRateLimiter,
    private readonly audit?: AIAuditSink,
  ) {}

  async chat(request: AIProductionRequest): Promise<AIChatResponse> {
    if (!DEFAULT_AI_CAPABILITY_POLICY.allowedCapabilities.includes(request.capability)) {
      await this.auditOutcome(request, 'denied');
      throw new AICapabilityError();
    }

    try {
      await this.rateLimiter?.check(request.principal);
      const response = await this.backend.chat({
        principal: request.principal,
        model: request.model,
        messages: request.messages,
        stream: request.stream,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
      });
      await this.auditOutcome(request, 'success');
      return response;
    } catch (error) {
      await this.auditOutcome(request, 'error');
      throw error;
    }
  }

  private async auditOutcome(
    request: AIProductionRequest,
    outcome: 'success' | 'denied' | 'error',
  ): Promise<void> {
    await this.audit?.record({
      userId: request.principal.userId,
      organizationId: request.principal.organizationId,
      storeId: request.principal.storeId,
      capability: request.capability,
      outcome,
    });
  }
}
