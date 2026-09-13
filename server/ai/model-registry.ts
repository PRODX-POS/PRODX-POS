export const AI_MODEL_TIERS = ['fast', 'coding', 'reasoning', 'vision', 'critical'] as const;
export type AIModelTier = (typeof AI_MODEL_TIERS)[number];

export interface AIModelProfile {
  readonly provider: string;
  readonly model: string;
  readonly tiers: readonly AIModelTier[];
  readonly qualityScore: number;
  readonly contextTokens: number;
  readonly supportsVision: boolean;
  readonly enabled: boolean;
}

export interface AIModelRegistry {
  list(): readonly AIModelProfile[];
  findEligible(criteria: {
    readonly tier: AIModelTier;
    readonly minQualityScore?: number;
    readonly requiresVision?: boolean;
  }): readonly AIModelProfile[];
}

export class StaticAIModelRegistry implements AIModelRegistry {
  private readonly models: readonly AIModelProfile[];

  constructor(models: readonly AIModelProfile[]) {
    validateModels(models);
    this.models = models.map((model) => ({ ...model, tiers: [...model.tiers] }));
  }

  list(): readonly AIModelProfile[] {
    return this.models;
  }

  findEligible(criteria: {
    readonly tier: AIModelTier;
    readonly minQualityScore?: number;
    readonly requiresVision?: boolean;
  }): readonly AIModelProfile[] {
    return this.models.filter(
      (model) =>
        model.enabled &&
        model.tiers.includes(criteria.tier) &&
        model.qualityScore >= (criteria.minQualityScore ?? 0) &&
        (!criteria.requiresVision || model.supportsVision),
    );
  }
}

function validateModels(models: readonly AIModelProfile[]): void {
  const seen = new Set<string>();
  for (const model of models) {
    const key = `${model.provider}:${model.model}`;
    if (seen.has(key)) throw new Error(`Duplicate AI model profile '${key}'.`);
    seen.add(key);
    if (!model.provider.trim() || !model.model.trim()) {
      throw new Error('AI model provider and model are required.');
    }
    if (!Number.isFinite(model.qualityScore) || model.qualityScore < 0 || model.qualityScore > 100) {
      throw new Error(`AI model '${key}' has an invalid qualityScore.`);
    }
    if (!Number.isInteger(model.contextTokens) || model.contextTokens < 1) {
      throw new Error(`AI model '${key}' has an invalid contextTokens value.`);
    }
    if (model.tiers.length === 0) throw new Error(`AI model '${key}' must declare at least one tier.`);
  }
}
