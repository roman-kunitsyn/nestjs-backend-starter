import { HealthState } from './health.state.js';

describe('HealthState', () => {
  it('tracks initialization and turns readiness off as shutdown begins', () => {
    const health = new HealthState();
    expect(health.startupComplete).toBe(false);
    expect(health.isStopping).toBe(false);
    health.onApplicationBootstrap();
    expect(health.startupComplete).toBe(true);
    health.beforeApplicationShutdown();
    expect(health.isStopping).toBe(true);
  });
});
