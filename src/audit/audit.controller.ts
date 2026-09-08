import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ApiThrottle } from '../common/decorators/throttle.decorator';
import { AuditService } from '../common/services/audit.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { FailedLoginsQueryDto } from './dto/failed-logins-query.dto';

/**
 * Read-only view of the audit trail.
 *
 * Admin-only throughout: the trail records who signed in from where and whose
 * role changed, which is exactly the material an attacker would use to pick a
 * next target. There is deliberately no write or delete route — the trail is
 * append-only, and a route that could edit it would defeat its purpose.
 */
@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@ApiThrottle()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Query the audit trail (Admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated audit entries.' })
  @ApiResponse({ status: 400, description: 'Invalid filter.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires admin role.' })
  findLogs(@Query() query: QueryAuditLogsDto) {
    return this.auditService.findLogs(query);
  }

  @Get('failed-logins')
  @ApiOperation({
    summary: 'Failed login attempts grouped by address (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Addresses with failed attempts, busiest first.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires admin role.' })
  failedLogins(@Query() query: FailedLoginsQueryDto) {
    return this.auditService.getFailedLoginAttempts(query.hours);
  }
}
