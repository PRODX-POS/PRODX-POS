export const AI_CAPABILITIES = ['assistant', 'explanation', 'draft'] as const;

export type AICapability = (typeof AI_CAPABILITIES)[number];

export const AI_NON_AUTHORITATIVE_DOMAINS = [
  'financial_totals',
  'vat',
  'inventory',
  'payments',
  'refunds',
  'audit',
] as const;

export type AINonAuthoritativeDomain = (typeof AI_NON_AUTHORITATIVE_DOMAINS)[number];

export interface AICapabilityPolicy {
  readonly requiredPermission: string;
  readonly allowedCapabilities: readonly AICapability[];
}

export const DEFAULT_AI_CAPABILITY_POLICY: AICapabilityPolicy = {
  requiredPermission: 'ai:use',
  allowedCapabilities: AI_CAPABILITIES,
};
