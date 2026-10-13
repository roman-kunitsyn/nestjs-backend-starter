import {
  Injectable,
  OnApplicationBootstrap,
  BeforeApplicationShutdown,
} from '@nestjs/common';

@Injectable()
export class HealthState
  implements OnApplicationBootstrap, BeforeApplicationShutdown
{
  private initialized = false;
  private stopping = false;
  onApplicationBootstrap(): void {
    this.initialized = true;
  }
  beforeApplicationShutdown(): void {
    this.stopping = true;
  }
  beginShutdown(): void {
    this.stopping = true;
  }
  get startupComplete(): boolean {
    return this.initialized;
  }
  get isStopping(): boolean {
    return this.stopping;
  }
}
