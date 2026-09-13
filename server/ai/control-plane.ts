import type { AIChatResponse, AIMessage } from './types';
import type { AIGatewayRequest, AIGatewayService, AIScope } from './gateway';
import type { AITask, AITaskRouter } from './task-router';

export interface AIControlPlaneRequest {
  readonly requestId: string;
  readonly scope: AIScope;
  readonly task: AITask;
  readonly messages: readonly AIMessage[];
  readonly temperature?: number;
  readonly max_tokens?: number;
  readonly preferredProvider?: string;
}

export class AIControlPlaneService {
  constructor(
    private readonly router: AITaskRouter,
    private readonly gateway: Pick<AIGatewayService, 'chat'>,
  ) {}

  async run(request: AIControlPlaneRequest): Promise<AIChatResponse> {
    const plan = this.router.plan(request.task, request.preferredProvider);
    const gatewayRequest: AIGatewayRequest = {
      requestId: request.requestId,
      scope: request.scope,
      permission: plan.permission,
      provider: plan.provider,
      model: plan.model,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
    };

    return this.gateway.chat(gatewayRequest);
  }
}
