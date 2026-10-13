import { Injectable } from '@nestjs/common';
import type { FastifyInstance } from 'fastify';
import { trace } from '@opentelemetry/api';

const HTTP_BUCKETS = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
] as const;
type HttpSample = {
  requests: number;
  seconds: number;
  inflight: number;
  buckets: number[];
};

/** Process-local metrics contain only bounded route and status labels. */
@Injectable()
export class MetricsService {
  private readonly http = new Map<string, HttpSample>();
  private readonly counters = new Map<string, number>();

  beginHttp(method: string, route: string) {
    const key = `${method}|${route}`;
    const sample = this.http.get(key) ?? {
      requests: 0,
      seconds: 0,
      inflight: 0,
      buckets: HTTP_BUCKETS.map(() => 0),
    };
    sample.inflight += 1;
    this.http.set(key, sample);
    const started = process.hrtime.bigint();
    return (status: number) => {
      sample.inflight = Math.max(0, sample.inflight - 1);
      sample.requests += 1;
      const elapsed = Number(process.hrtime.bigint() - started) / 1e9;
      sample.seconds += elapsed;
      HTTP_BUCKETS.forEach((bound, index) => {
        if (elapsed <= bound)
          sample.buckets[index] = (sample.buckets[index] ?? 0) + 1;
      });
      this.increment(
        'http_requests_total',
        `${method}|${route}|${Math.floor(status / 100)}xx`,
      );
    };
  }

  increment(
    name:
      | 'http_requests_total'
      | 'authentication_failures_total'
      | 'refresh_token_reuse_total'
      | 'email_delivery_failures_total',
    key = 'total',
  ) {
    const id = `${name}|${key}`;
    this.counters.set(id, (this.counters.get(id) ?? 0) + 1);
  }

  render(
    appName: string,
    dbMax: number,
    sessions: { state: string; count: number }[],
  ): string {
    const lines = [
      '# HELP http_requests_total Completed HTTP requests.',
      '# TYPE http_requests_total counter',
      '# HELP http_request_duration_seconds HTTP request duration in seconds.',
      '# TYPE http_request_duration_seconds histogram',
      '# HELP http_inflight_requests Requests currently being handled.',
      '# TYPE http_inflight_requests gauge',
    ];
    for (const [key, value] of this.http) {
      const [method, route] = key.split('|');
      lines.push(
        `http_inflight_requests{method="${method}",route="${route}"} ${value.inflight}`,
      );
      lines.push(
        ...HTTP_BUCKETS.map(
          (bound, index) =>
            `http_request_duration_seconds_bucket{method="${method}",route="${route}",le="${bound}"} ${value.buckets[index] ?? 0}`,
        ),
      );
      lines.push(
        `http_request_duration_seconds_bucket{method="${method}",route="${route}",le="+Inf"} ${value.requests}`,
        `http_request_duration_seconds_sum{method="${method}",route="${route}"} ${value.seconds}`,
        `http_request_duration_seconds_count{method="${method}",route="${route}"} ${value.requests}`,
      );
    }
    for (const name of [
      'http_requests_total',
      'authentication_failures_total',
      'refresh_token_reuse_total',
      'email_delivery_failures_total',
    ]) {
      if (name !== 'http_requests_total') lines.push(`# TYPE ${name} counter`);
      for (const [id, value] of this.counters) {
        const [metric, ...labelParts] = id.split('|');
        const labels = labelParts.join('|');
        if (metric !== name) continue;
        if (name === 'http_requests_total') {
          const [method, route, status] = labels!.split('|');
          lines.push(
            `${name}{method="${method}",route="${route}",status_class="${status}"} ${value}`,
          );
        } else lines.push(`${name} ${value}`);
      }
    }
    lines.push(
      '# TYPE database_pool_max_connections gauge',
      `database_pool_max_connections{pool="${appName}"} ${dbMax}`,
    );
    lines.push(
      '# HELP database_connections PostgreSQL sessions used by this service.',
      '# TYPE database_connections gauge',
    );
    for (const state of ['active', 'idle']) {
      const count = sessions
        .filter((row) => row.state === state)
        .reduce((total, row) => total + row.count, 0);
      lines.push(
        `database_connections{pool="${appName}",state="${state}"} ${count}`,
      );
    }
    return `${lines.join('\n')}\n`;
  }
}

export function configureHttpMetrics(
  fastify: FastifyInstance,
  metrics: MetricsService,
): void {
  const requestStarted = new WeakMap<object, (status: number) => void>();
  fastify.addHook('onRequest', (request, _reply, done) => {
    trace.getActiveSpan()?.setAttribute('request.id', request.id);
    const method = [
      'GET',
      'HEAD',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ].includes(request.method)
      ? request.method
      : 'OTHER';
    requestStarted.set(
      request,
      metrics.beginHttp(method, request.routeOptions.url ?? 'unmatched'),
    );
    done();
  });
  fastify.addHook('onResponse', (request, reply, done) => {
    requestStarted.get(request)?.(reply.statusCode);
    done();
  });
}
