import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '../common/decorators/throttle.decorator';

@ApiTags('Health')
@Controller('health')
// Probes poll on a fixed interval from every orchestrator replica and from the
// container HEALTHCHECK. Counting them against the 20/min budget would have
// them reporting the service unhealthy purely because they asked too often.
@SkipThrottle()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Full health check (database + memory)' })
  @ApiResponse({ status: 200, description: 'All checks passed.' })
  @ApiResponse({ status: 503, description: 'At least one check failed.' })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }

  /**
   * Liveness deliberately checks nothing external. A liveness failure means
   * "restart this container", and restarting will not bring the database back —
   * it would only turn a database outage into a cluster-wide restart loop.
   */
  @Get('liveness')
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe — is the process responsive?' })
  @ApiResponse({ status: 200, description: 'Process is alive.' })
  liveness() {
    return this.health.check([]);
  }

  /**
   * Readiness gates traffic: a replica that cannot reach the database should
   * be pulled from the load balancer without being restarted.
   */
  @Get('readiness')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — can the service take traffic?' })
  @ApiResponse({ status: 200, description: 'Ready to serve requests.' })
  @ApiResponse({ status: 503, description: 'Dependencies unavailable.' })
  readiness() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
