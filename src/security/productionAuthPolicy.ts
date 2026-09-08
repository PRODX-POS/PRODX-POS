/**
 * Production authentication policy.
 * Demo role switching and universal unlock credentials are never enabled in production.
 */
export const DEMO_ROLE_SWITCH_ENABLED = import.meta.env.DEV;

export function canUseDemoAuthFeatures(): boolean {
  return DEMO_ROLE_SWITCH_ENABLED;
}
