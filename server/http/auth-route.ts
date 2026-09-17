import type { Express, Request } from 'express';
import type { SessionIssuer } from '../auth/session';
import type { SqlExecutor } from '../auth/postgres-repository';

type LoginBody = { organizationSlug?: unknown; storeCode?: unknown; emailOrPin?: unknown; passwordOrPin?: unknown; registerId?: unknown };
type LoginScope = { organizationId: string; storeId: string; deviceId: string };
const bearerToken = (request: Request): string | null => { const header = request.header('authorization'); if (!header) return null; const match = /^Bearer\s+(.+)$/i.exec(header); return match?.[1]?.trim() || null; };
const resolveLoginScope = async (db: SqlExecutor, organizationSlug: string, storeCode: string, registerId: string): Promise<LoginScope | null> => {
  const rows = await db.query<{ organization_id: string; store_id: string; device_id: string }>(`SELECT o.id AS organization_id, s.id AS store_id, d.id AS device_id FROM prodx_organizations o JOIN prodx_stores s ON s.organization_id = o.id AND lower(s.code) = lower($2) AND s.active = TRUE JOIN prodx_devices d ON d.organization_id = o.id AND d.store_id = s.id AND d.register_id = $3 AND d.status = 'active' WHERE lower(o.code) = lower($1) LIMIT 1`, [organizationSlug, storeCode, registerId]);
  const row = rows[0]; return row ? { organizationId: row.organization_id, storeId: row.store_id, deviceId: row.device_id } : null;
};
const resolveUserId = async (db: SqlExecutor, username: string, organizationId: string): Promise<string | null> => { const rows = await db.query<{ user_id: string }>(`SELECT id AS user_id FROM prodx_users WHERE lower(username) = lower($1) AND organization_id = $2 AND status = 'active' LIMIT 1`, [username, organizationId]); return rows[0]?.user_id ?? null; };
const userBelongsToStore = async (db: SqlExecutor, organizationId: string, userId: string, storeId: string): Promise<boolean> => { const rows = await db.query<{ allowed: boolean }>(`SELECT EXISTS (SELECT 1 FROM prodx_store_memberships WHERE organization_id = $1 AND user_id = $2 AND store_id = $3 AND active = TRUE) AS allowed`, [organizationId, userId, storeId]); return rows[0]?.allowed === true; };
export const registerAuthRoute = (app: Express, authentication: SessionIssuer, db: SqlExecutor): void => {
  app.post('/api/v1/auth/login', async (request: Request, response) => {
    const body = (request.body ?? {}) as LoginBody;
    if (typeof body.organizationSlug !== 'string' || typeof body.storeCode !== 'string' || typeof body.emailOrPin !== 'string' || typeof body.passwordOrPin !== 'string' || typeof body.registerId !== 'string' || !body.organizationSlug.trim() || !body.storeCode.trim() || !body.emailOrPin.trim() || !body.passwordOrPin || !body.registerId.trim()) { response.status(400).json({ error: { code: 'INVALID_LOGIN_REQUEST', message: 'organizationSlug, storeCode, emailOrPin, passwordOrPin and registerId are required.', requestId: request.id } }); return; }
    const scope = await resolveLoginScope(db, body.organizationSlug.trim(), body.storeCode.trim(), body.registerId.trim());
    if (!scope) { response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Authentication failed.', requestId: request.id } }); return; }
    const userId = await resolveUserId(db, body.emailOrPin.trim(), scope.organizationId);
    if (!userId || !(await userBelongsToStore(db, scope.organizationId, userId, scope.storeId))) { response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Authentication failed.', requestId: request.id } }); return; }
    const session = await authentication.authenticateCredentials({ username: body.emailOrPin.trim(), password: body.passwordOrPin, deviceId: scope.deviceId, organizationId: scope.organizationId });
    if (!session) { response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Authentication failed.', requestId: request.id } }); return; }
    response.status(200).json({ token: session.token, sessionId: session.sessionId, expiresAt: session.expiresAt.toISOString(), organizationId: scope.organizationId, storeId: scope.storeId, userId, registerId: body.registerId.trim() });
  });
  app.get('/api/v1/auth/session', async (request: Request, response) => {
    const token = bearerToken(request);
    if (!token) { response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.', requestId: request.id } }); return; }
    const session = await authentication.authenticateBearer(token);
    if (!session) { response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication could not be verified.', requestId: request.id } }); return; }
    const rows = await db.query<{ organization_id: string; organization_name: string; organization_slug: string; store_id: string; store_code: string; store_name: string; user_id: string; user_name: string; username: string }>(`SELECT o.id AS organization_id, o.name AS organization_name, o.code AS organization_slug, s.id AS store_id, s.code AS store_code, s.name AS store_name, u.id AS user_id, u.display_name AS user_name, u.username FROM prodx_organizations o JOIN prodx_stores s ON s.id = $2 AND s.organization_id = o.id JOIN prodx_users u ON u.id = $3 AND u.organization_id = o.id WHERE o.id = $1 AND s.active = TRUE AND u.status = 'active' LIMIT 1`, [session.organizationId, session.storeId, session.userId]);
    const row = rows[0];
    if (!row) { response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Session scope could not be resolved.', requestId: request.id } }); return; }
    response.status(200).json({ organization: { id: row.organization_id, name: row.organization_name, slug: row.organization_slug, stores: [{ id: row.store_id, organizationId: row.organization_id, code: row.store_code, name: row.store_name, address: '', phone: '', currency: '', timezone: '', defaultTaxRateBps: 0 }] }, currentStore: { id: row.store_id, organizationId: row.organization_id, code: row.store_code, name: row.store_name, address: '', phone: '', currency: '', timezone: '', defaultTaxRateBps: 0 }, registerId: request.header('x-register-id') ?? '', currentUser: { id: row.user_id, name: row.user_name, email: row.username, role: 'cashier', employeeCode: row.username, permissions: [] }, token, expiresAt: session.expiresAt.toISOString(), sessionId: session.sessionId });
  });
  app.post('/api/v1/auth/logout', async (request: Request, response) => { const token = bearerToken(request); if (token) await authentication.revokeBearer(token); response.status(204).send(); });
};
