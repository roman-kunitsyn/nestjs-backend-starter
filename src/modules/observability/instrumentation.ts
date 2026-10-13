import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

// This module is imported before Nest and Fastify so supported integrations can
// patch their libraries before those modules load. OTEL remains opt-in.
export const tracingSdk =
  process.env.OTEL_ENABLED === 'true'
    ? new NodeSDK({
        traceExporter: new OTLPTraceExporter(
          process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
            ? { url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT }
            : undefined,
        ),
        instrumentations: [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-http': {
              redactedQueryParams: [
                'access_token',
                'authorization',
                'code',
                'email',
                'password',
                'refresh_token',
                'secret',
                'token',
              ],
              redactedQueryParamsServer: [
                'access_token',
                'authorization',
                'code',
                'email',
                'password',
                'refresh_token',
                'secret',
                'token',
              ],
            },
          }),
        ],
        serviceName: process.env.APP_NAME ?? 'nestjs-backend-starter',
      })
    : undefined;

tracingSdk?.start();
