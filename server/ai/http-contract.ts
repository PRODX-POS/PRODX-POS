import { AIBackendPrincipal, AIBackendRequest, AIBackendBoundary } from './backend-boundary';
import { AIChatResponse } from './types';

/**
 * Framework-neutral HTTP adapter contract.
 *
 * The concrete production backend must authenticate the transport first, derive
 * the principal from verified auth context, then delegate to AIBackendBoundary.
 * It must never trust browser-supplied identity or permission fields.
 */
export interface AIHttpRequest {
  readonly body: Omit<AIBackendRequest, 'principal'>;
  readonly principal: AIBackendPrincipal;
}

export interface AIHttpAdapter {
  handle(request: AIHttpRequest, boundary: AIBackendBoundary): Promise<AIChatResponse>;
}

export function createAIHttpAdapter(): AIHttpAdapter {
  return {
    async handle(request, boundary) {
      return boundary.chat({ ...request.body, principal: request.principal });
    },
  };
}
