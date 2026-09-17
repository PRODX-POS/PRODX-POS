export type ProductionLoginRequest = {
  organizationSlug: string;
  storeCode: string;
  emailOrPin: string;
  passwordOrPin?: string;
  registerId: string;
};

export type ProductionSessionResponse = {
  token: string;
  sessionId: string;
  expiresAt: string;
};
