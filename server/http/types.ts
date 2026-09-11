export type RequestPrincipal = {
  userId: string;
  organizationId: string;
  storeId: string;
};

export type RequestContext = {
  requestId: string;
  principal: RequestPrincipal;
};

export type AuthenticateRequest = (
  request: import('express').Request,
) => Promise<RequestPrincipal | null> | RequestPrincipal | null;

export type AuthorizeRequest = (
  context: RequestContext,
  permission: string,
) => Promise<boolean> | boolean;

export type ValidationIssue = {
  field: string;
  message: string;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
};
