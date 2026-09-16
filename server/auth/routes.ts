import type { Express, Request, Response } from 'express';
import type { SessionIssuer } from './session';

export const registerAuthRoutes = (app: Express, authentication: SessionIssuer): void => {
  app.post('/auth/login', async (request: Request, response: Response) => {
    const body = request.body as { username?: unknown; password?: unknown; deviceId?: unknown };
    if (typeof body?.username !== 'string' || typeof body.password !== 'string' || typeof body.deviceId !== 'string') {
      response.status(400).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Username, password, and deviceId are required.', requestId: request.id } });
      return;
    }

    const result = await authentication.authenticateCredentials({
      username: body.username,
      password: body.password,
      deviceId: body.deviceId,
    });
    if (!result) {
      response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication failed.', requestId: request.id } });
      return;
    }

    response.status(200).json(result);
  });
};
