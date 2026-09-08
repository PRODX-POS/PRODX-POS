export type AIAuthoritativeDomain =
  | 'financial_totals'
  | 'vat'
  | 'inventory'
  | 'payments'
  | 'refunds'
  | 'audit';

export const AI_AUTHORITY_RULE =
  'AI output is advisory; authoritative POS facts must be read from and validated by the domain/backend.' as const;
