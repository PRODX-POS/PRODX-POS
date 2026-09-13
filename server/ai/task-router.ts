import type { AIModelProfile, AIModelRegistry, AIModelTier } from './model-registry';

export const AI_TASKS = [
  'assistant',
  'explanation',
  'draft',
  'code_generation',
  'refactoring',
  'debugging',
  'test_generation',
  'migration_analysis',
  'ux_analysis',
  'ui_design',
  'css_generation',
  'accessibility_review',
  'design_system_review',
  'code_review',
  'architecture_review',
  'security_review',
  'database_review',
  'production_readiness_review',
  'sales_insight',
  'inventory_insight',
  'operational_assistant',
  'management_insight',
] as const;

export type AITask = (typeof AI_TASKS)[number];

export type AIRiskTier = 'low' | 'medium' | 'high' | 'critical';

export interface AITaskPolicy {
  readonly tier: AIModelTier;
  readonly minQualityScore: number;
  readonly requiresVision?: boolean;
  readonly risk: AIRiskTier;
  readonly permission: string;
}

export interface AITaskPlan {
  readonly task: AITask;
  readonly risk: AIRiskTier;
  readonly permission: string;
  readonly provider: string;
  readonly model: string;
  readonly contextTokens: number;
  readonly requiresHumanApproval: boolean;
}

const COMMON_TASKS: Record<AITask, AITaskPolicy> = {
  assistant: { tier: 'fast', minQualityScore: 60, risk: 'low', permission: 'ai:use' },
  explanation: { tier: 'fast', minQualityScore: 60, risk: 'low', permission: 'ai:use' },
  draft: { tier: 'fast', minQualityScore: 60, risk: 'low', permission: 'ai:use' },
  code_generation: { tier: 'coding', minQualityScore: 75, risk: 'medium', permission: 'ai:engineering' },
  refactoring: { tier: 'coding', minQualityScore: 75, risk: 'medium', permission: 'ai:engineering' },
  debugging: { tier: 'coding', minQualityScore: 75, risk: 'medium', permission: 'ai:engineering' },
  test_generation: { tier: 'coding', minQualityScore: 75, risk: 'medium', permission: 'ai:engineering' },
  migration_analysis: { tier: 'reasoning', minQualityScore: 85, risk: 'high', permission: 'ai:engineering' },
  ux_analysis: { tier: 'vision', minQualityScore: 80, requiresVision: true, risk: 'medium', permission: 'ai:design' },
  ui_design: { tier: 'vision', minQualityScore: 80, requiresVision: true, risk: 'medium', permission: 'ai:design' },
  css_generation: { tier: 'coding', minQualityScore: 75, risk: 'medium', permission: 'ai:design' },
  accessibility_review: { tier: 'vision', minQualityScore: 80, requiresVision: true, risk: 'high', permission: 'ai:design' },
  design_system_review: { tier: 'reasoning', minQualityScore: 85, risk: 'high', permission: 'ai:design' },
  code_review: { tier: 'reasoning', minQualityScore: 85, risk: 'high', permission: 'ai:review' },
  architecture_review: { tier: 'critical', minQualityScore: 90, risk: 'critical', permission: 'ai:review' },
  security_review: { tier: 'critical', minQualityScore: 95, risk: 'critical', permission: 'ai:security' },
  database_review: { tier: 'critical', minQualityScore: 90, risk: 'critical', permission: 'ai:security' },
  production_readiness_review: { tier: 'critical', minQualityScore: 95, risk: 'critical', permission: 'ai:review' },
  sales_insight: { tier: 'reasoning', minQualityScore: 80, risk: 'high', permission: 'ai:operations' },
  inventory_insight: { tier: 'reasoning', minQualityScore: 80, risk: 'high', permission: 'ai:operations' },
  operational_assistant: { tier: 'reasoning', minQualityScore: 80, risk: 'high', permission: 'ai:operations' },
  management_insight: { tier: 'reasoning', minQualityScore: 85, risk: 'high', permission: 'ai:operations' },
};

export class AITaskRouter {
  constructor(private readonly registry: AIModelRegistry) {}

  plan(task: AITask, preferredProvider?: string): AITaskPlan {
    const policy = COMMON_TASKS[task];
    const candidates = this.registry
      .findEligible({
        tier: policy.tier,
        minQualityScore: policy.minQualityScore,
        requiresVision: policy.requiresVision,
      })
      .filter((model) => !preferredProvider || model.provider === preferredProvider)
      .sort(compareModels);

    const selected = candidates[0];
    if (!selected) {
      throw new Error(`No eligible AI model is available for task '${task}'.`);
    }

    return {
      task,
      risk: policy.risk,
      permission: policy.permission,
      provider: selected.provider,
      model: selected.model,
      contextTokens: selected.contextTokens,
      requiresHumanApproval: policy.risk === 'high' || policy.risk === 'critical',
    };
  }

  policy(task: AITask): AITaskPolicy {
    return COMMON_TASKS[task];
  }
}

function compareModels(a: AIModelProfile, b: AIModelProfile): number {
  if (b.qualityScore !== a.qualityScore) return b.qualityScore - a.qualityScore;
  return b.contextTokens - a.contextTokens;
}
