import { validateEnvironment } from './environment.js';

describe('environment configuration', () => {
  it('provides safe development defaults', () => {
    expect(validateEnvironment({})).toEqual({
      NODE_ENV: 'development',
      APP_NAME: 'nestjs-backend-starter',
      APP_HOST: '127.0.0.1',
      PORT: 3000,
      API_DOCS_ENABLED: true,
      DATABASE_URL:
        'postgresql://app:local_dev_only_change_me@localhost:5432/app',
      DB_POOL_MAX: 10,
      DB_CONNECT_TIMEOUT_SECONDS: 10,
      DB_IDLE_TIMEOUT_SECONDS: 20,
      AUTH_JWT_ISSUER: 'https://api.example.com',
      AUTH_JWT_AUDIENCE: 'nestjs-backend-starter',
      AUTH_JWT_KID: 'local-ed25519-1',
      AUTH_JWT_PRIVATE_KEY: '',
      AUTH_JWT_PUBLIC_KEY: '',
      AUTH_JWT_PUBLIC_KEYS: '',
      AUTH_REFRESH_TOKEN_KEY: '',
      AUTH_REFRESH_IDLE_DAYS: 14,
      AUTH_SESSION_MAX_DAYS: 30,
    });
  });

  it('disables interactive API docs by default in production while allowing explicit configuration', () => {
    expect(
      validateEnvironment({
        NODE_ENV: 'production',
        AUTH_JWT_PRIVATE_KEY: 'private',
        AUTH_JWT_PUBLIC_KEY: 'public',
        AUTH_REFRESH_TOKEN_KEY: 'A'.repeat(43),
      }).API_DOCS_ENABLED,
    ).toBe(false);
    expect(
      validateEnvironment({
        NODE_ENV: 'production',
        AUTH_JWT_PRIVATE_KEY: 'private',
        AUTH_JWT_PUBLIC_KEY: 'public',
        AUTH_REFRESH_TOKEN_KEY: 'A'.repeat(43),
        API_DOCS_ENABLED: 'true',
      }).API_DOCS_ENABLED,
    ).toBe(true);
  });

  it('requires configured asymmetric JWT keys in production', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'production' })).toThrow(
      'AUTH_JWT_PRIVATE_KEY and AUTH_JWT_PUBLIC_KEY are required',
    );
  });

  it('rejects unsupported API_DOCS_ENABLED values', () => {
    expect(() =>
      validateEnvironment({ API_DOCS_ENABLED: 'sometimes' }),
    ).toThrow('API_DOCS_ENABLED:');
  });

  it('parses configured port values', () => {
    expect(
      validateEnvironment({ PORT: '4317', APP_HOST: '0.0.0.0' }),
    ).toMatchObject({
      PORT: 4317,
      APP_HOST: '0.0.0.0',
    });
  });

  it.each(['0', '65536', 'not-a-port'])(
    'rejects invalid port %s without echoing input',
    (port) => {
      let errorMessage = '';
      try {
        validateEnvironment({ PORT: port });
      } catch (error) {
        if (error instanceof Error) errorMessage = error.message;
      }

      expect(errorMessage).toContain(
        'Invalid environment configuration: PORT:',
      );
      expect(errorMessage).not.toContain(port);
    },
  );

  it('rejects unsupported runtime environments', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'preview' })).toThrow(
      'NODE_ENV: Invalid option',
    );
  });
});
