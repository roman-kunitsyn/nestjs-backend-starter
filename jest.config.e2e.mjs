import baseConfig from './jest.config.mjs';

/** @type {import('jest').Config} */
export default {
  ...baseConfig,
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  testTimeout: 15000,
};
