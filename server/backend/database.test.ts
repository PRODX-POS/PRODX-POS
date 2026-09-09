import { describe, expect, it } from 'node:test';
import { readDatabaseConfig } from './database';

void describe('database foundation contract', () => {
  it('requires DATABASE_URL', () => {
    expect(() => readDatabaseConfig({})).toThrow(/DATABASE_URL is required/);
  });

  it('rejects invalid statement timeout', () => {
    expect(() => readDatabaseConfig({ DATABASE_URL: 'postgresql://example', DB_STATEMENT_TIMEOUT_MS: '0' })).toThrow(
      /DB_STATEMENT_TIMEOUT_MS/,
    );
  });

  it('normalizes valid configuration', () => {
    expect(readDatabaseConfig({ DATABASE_URL: 'postgresql://example', DB_STATEMENT_TIMEOUT_MS: '7500' })).toEqual({
      url: 'postgresql://example',
      applicationName: 'prodx-pos-backend',
      statementTimeoutMs: 7500,
    });
  });
});
