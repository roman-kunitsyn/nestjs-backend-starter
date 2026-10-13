import { MetricsService } from './metrics.js';

describe('MetricsService', () => {
  it('renders bounded HTTP labels and operational counters without identifiers', () => {
    const metrics = new MetricsService();
    const finish = metrics.beginHttp(
      'GET',
      '/api/v1/organizations/:id/resources',
    );
    finish(200);
    metrics.increment('authentication_failures_total');
    metrics.increment('refresh_token_reuse_total');
    metrics.increment('email_delivery_failures_total');

    const output = metrics.render('starter', 10, [
      { state: 'active', count: 2 },
      { state: 'idle', count: 3 },
    ]);

    expect(output).toContain(
      'http_requests_total{method="GET",route="/api/v1/organizations/:id/resources",status_class="2xx"} 1',
    );
    expect(output).toContain(
      'database_connections{pool="starter",state="active"} 2',
    );
    expect(output).toContain(
      'database_pool_max_connections{pool="starter"} 10',
    );
    expect(output).toContain('authentication_failures_total 1');
    expect(output).not.toMatch(/userId|organizationId|@/);
  });
});
