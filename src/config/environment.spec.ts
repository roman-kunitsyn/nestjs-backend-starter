import { validateEnvironment } from './environment.js';

describe('environment configuration', () => {
  it('provides safe development defaults', () => {
    expect(validateEnvironment({})).toEqual({
      NODE_ENV: 'development',
      APP_NAME: 'nestjs-backend-starter',
      APP_HOST: '127.0.0.1',
      PORT: 3000,
    });
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
