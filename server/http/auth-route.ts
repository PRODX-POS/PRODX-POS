import type { Express, Request } from 'express';
import type { SessionIssuer } from '../auth/session';
import type { SqlExecutor } from '../auth/postgres-repository';

type LoginBody = {
  organizationSlug?: unknown;
  storeCode?: unknown;
  emailOrPin?: unknown;
  passwordOrPin?: unknown;
  registerId?: unknown;
};

type LoginScope = { organizationId: string; storeId: string; deviceId: string };

const resolveLoginScope = async (db: SqlExecutor, organizationSlug: string, storeCode: string, registerId: string): Promise<LoginScope | null> => {
  const rows = await db.query<{ organization_id: string; store_id: string; device_id: string }>(
    `SELECT o.id AS organization_id, s.id AS store_id, d.id AS device_id
       FROM prodx_organizations o
       JOIN prodx_stores s ON s.organization_id = o.id AND lower(s.code) = lower($2) AND s.active = TRUE
       JOIN prodx_devices d ON d.organization_id = o.id AND d.store_id = s.id
                           AND d.register_id = $3 AND d.status = 'active'
      WHERE lower(o.code) = lower($1)
      LIMIT 1`,
    [organizationSlug, storeCode, registerId],
  );
  const row = rows[0];
  return row ? { organizationId: row.organization_id, storeId: row.store_id, deviceId: row.device_id } : null;
};

const userBelongsToStore = async (db: SqlExecutor, organizationId: string, userId: string, storeId: string): Promise<boolean> => {
  const rows = await db.query<{ allowed: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM prodx_store_memberships
        WHERE organization_id = $1 AND user_id = $2 AND store_id = $3 AND active = TRUE
     ) AS allowed`,
    [organizationId, userId, storeId],
  );
  return rows[0]?.allowed === true;
};

export const registerAuthRoute = (app: Express, authentication: SessionIssuer, db: SqlExecutor): void => {
  app.post('/api/v1/auth/login', async (request: Request, response) => {
    const body = (request.body ?? {}) as LoginBody;
    if (
      typeof body.organizationSlug !== 'string' ||
      typeof body.storeCode !== 'string' ||
      typeof body.emailOrPin !== 'string' ||
      typeof body.passwordOrPin !== 'string' ||
      typeof body.registerId !== 'string' ||
      !body.organizationSlug.trim() ||
      !body.storeCode.trim() ||
      !body.emailOrPin.trim() ||
      !body.passwordOrPin ||
      !body.registerId.trim()
    ) {
      response.status(400).json({ error: { code: 'INVALID_LOGIN_REQUEST', message: 'organizationSlug, storeCode, emailOrPin, passwordOrPin and registerId are required.', requestId: request.id } });
      return;
    }

    const scope = await resolveLoginScope(db, body.organizationSlug.trim(), body.storeCode.trim(), body.registerId.trim());
    if (!scope) {
      response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Authentication failed.', requestId: request.id } });
      return;
    }

    const session = await authentication.authenticateCredentials({
      username: body.emailOrPin.trim(),
      password: body.passwordOrPin,
      deviceId: scope.deviceId,
    });
    if (!session) {
      response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Authentication failed.', requestId: request.id } });
      return;
    }

    const authenticatedUserRows = await db.query<{ user_id: string; organization_id: string }>(
      `SELECT id AS user_id, organization_id
         FROM prodx_users
        WHERE lower(username) = lower($1) AND organization_id = $2 AND status = 'active'
        LIMIT 1`,
      [body.emailOrPin.trim(), scope.organizationId],
    );
    const authenticatedUser = authenticatedUserRows[0];
    if (!authenticatedUser || !(await userBelongsToStore(db, scope.organizationId, authenticatedUser.user_id, scope.storeId))) {
      response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Authentication failed.', requestId: request.id } });
      return;
    }

    response.status(200).json({
      token: session.token,
      sessionId: session.sessionId,
      organizationId: scope.organizationId,
      storeId: scope.storeId,
      userId: authenticatedUser.user_id,
      registerId: body.registerId.trim(),
    });
  });
};
