import type { Express, Request } from 'express';
import type { SessionIssuer } from '../auth/session';

type LoginBody = { username?: unknown; password?: unknown; deviceId?: unknown };

export const registerAuthRoute = (app: Express, authentication: SessionIssuer): void => {
  app.post('/api/v1/auth/login', async (request: Request, response) => {
    const body = (request.body ?? {}) as LoginBody;
    if (typeof body.username !== 'string' || typeof body.password !== 'string' || typeof body.deviceId !== 'string') {
      response.status(400).json({ error: { code: 'INVALID_LOGIN_REQUEST', message: 'username, password and deviceId are required.', requestId: request.id } });
      return;
    }

    const session = await authentication.authenticateCredentials({
      username: body.username,
      password: body.password,
      deviceId: body.deviceId,
    });
    if (!session) {
      response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Authentication failed.', requestId: request.id } });
      return;
    }

    response.status(200).json({ token: session.token, sessionId: session.sessionId });
  });
};
