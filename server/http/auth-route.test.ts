import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from './createApp';
import { registerAuthRoute } from './auth-route';
import type { SessionIssuer } from '../auth/session';
import type { SqlExecutor } from '../auth/postgres-repository';

const dbFixture = (scope = { organization_id: 'org-1', store_id: 'store-1', device_id: 'device-1' }): SqlExecutor => ({
  async query<T extends Record<string, unknown>>(sql: string): Promise<readonly T[]> {
    if (sql.includes('FROM prodx_organizations')) return [scope as unknown as T];
    if (sql.includes('FROM prodx_store_memberships')) return [{ allowed: true } as unknown as T];
    if (sql.includes('FROM prodx_users')) return [{ user_id: 'user-1' } as unknown as T];
    return [];
  },
});

const requestJson=async(app:ReturnType<typeof createApp>,body:unknown)=>{const server=await new Promise<import('node:http').Server>(resolve=>{const instance=app.listen(0,()=>resolve(instance));});try{const address=server.address();if(!address||typeof address==='string')throw new Error('Test server did not expose a port.');return await fetch(`http://127.0.0.1:${address.port}/api/v1/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});}finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}};

const loginBody = { organizationSlug:'org-1', storeCode:'store-1', emailOrPin:'cashier', passwordOrPin:'secret', registerId:'REG-01' };

test('login is explicitly public and returns a tenant/store/register-bound session',async()=>{const authentication:SessionIssuer={authenticateCredentials:async()=>({token:'token',sessionId:'session',expiresAt:new Date('2026-09-13T20:00:00.000Z')}),authenticateBearer:async()=>null};const app=createApp({authenticateRequest:async()=>null,publicPaths:['/api/v1/auth/login'],configureRoutes:configuredApp=>registerAuthRoute(configuredApp,authentication,dbFixture())});const response=await requestJson(app,loginBody);assert.equal(response.status,200);assert.deepEqual(await response.json(),{token:'token',sessionId:'session',expiresAt:'2026-09-13T20:00:00.000Z',organizationId:'org-1',storeId:'store-1',userId:'user-1',registerId:'REG-01'});});

test('invalid login shape is rejected before authentication',async()=>{const authentication:SessionIssuer={authenticateCredentials:async()=>{throw new Error('must not authenticate');},authenticateBearer:async()=>null};const app=createApp({authenticateRequest:async()=>null,publicPaths:['/api/v1/auth/login'],configureRoutes:configuredApp=>registerAuthRoute(configuredApp,authentication,dbFixture())});const response=await requestJson(app,{username:'cashier',password:'secret',deviceId:'device'});assert.equal(response.status,400);assert.equal((await response.json()).error.code,'INVALID_LOGIN_REQUEST');});

test('failed login does not disclose credential details',async()=>{const authentication:SessionIssuer={authenticateCredentials:async()=>null,authenticateBearer:async()=>null};const app=createApp({authenticateRequest:async()=>null,publicPaths:['/api/v1/auth/login'],configureRoutes:configuredApp=>registerAuthRoute(configuredApp,authentication,dbFixture())});const response=await requestJson(app,loginBody);assert.equal(response.status,401);assert.equal((await response.json()).error.code,'INVALID_CREDENTIALS');});
