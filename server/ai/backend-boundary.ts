import { AICoreRequest, AICoreService } from './core';
import { AIChatResponse } from './types';

export interface AIBackendPrincipal {
  readonly userId: string;
  readonly organizationId: string;
  readonly storeId: string;
  readonly permissions: readonly string[];
}

export interface AIBackendRequest extends Omit<AICoreRequest, 'provider'> {
  readonly principal?: AIBackendPrincipal;
  readonly provider?: string;
}

export interface AIBackendPolicy {
  readonly requiredPermission: string;
}

export class AIAuthorizationError extends Error {
  constructor(message = 'AI request is not authorized.') {
    super(message);
    this.name = 'AIAuthorizationError';
  }
}

/**
 * Framework-neutral backend authorization boundary.
 *
 * A real HTTP adapter must authenticate the request and construct the principal
 * from verified backend auth context. Browser-supplied identity fields are not
 * authentication evidence and must not be trusted by this boundary.
 */
export class AIBackendBoundary {
  constructor(
    private readonly core: AICoreService,
    private readonly policy: AIBackendPolicy = { requiredPermission: 'ai:use' },
  ) {}

  async chat(request: AIBackendRequest): Promise<AIChatResponse> {
    const principal = request.principal;
    if (!principal?.userId || !principal.organizationId || !principal.storeId) {
      throw new AIAuthorizationError('Authenticated organization/store context is required.');
    }
    if (!principal.permissions.includes(this.policy.requiredPermission)) {
      throw new AIAuthorizationError('AI permission is required.');
    }

    return this.core.chat({
      model: request.model,
      messages: request.messages,
      stream: request.stream,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      provider: request.provider,
    });
  }
}
