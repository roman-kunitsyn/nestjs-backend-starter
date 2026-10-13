import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { tracingSdk } from './instrumentation.js';

@Injectable()
export class TracingLifecycle implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    if (tracingSdk) await tracingSdk.shutdown();
  }
}
