import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { AuditLog, AuditStatus } from '../../audit/entities/audit-log.entity';

export interface AuditLogFilter {
  action?: string;
  status?: AuditStatus;
  userId?: string;
  userEmail?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

export interface FailedLoginSummary {
  email: string;
  count: number;
  lastAttempt: Date;
}

/**
 * Records security-sensitive operations to the audit_logs table.
 *
 * Rows are written and read, never updated: an audit trail that can be edited
 * after the fact is not evidence of anything.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Log authentication event
   */
  logAuthEvent(event: {
    email: string;
    action:
      | 'login'
      | 'register'
      | 'logout'
      | 'password_change'
      | 'token_refresh';
    status: AuditStatus;
    reason?: string;
    ipAddress?: string;
  }): void {
    this.logger.log(
      `[AUDIT] ${event.action.toUpperCase()} - ${event.email} - ${event.status} ${event.reason ? `- Reason: ${event.reason}` : ''}`,
    );

    this.persist({
      userId: null,
      userEmail: event.email,
      action: event.action,
      resourceType: 'auth',
      resourceId: event.email,
      status: event.status,
      reason: event.reason ?? null,
      ipAddress: event.ipAddress ?? null,
    });
  }

  /**
   * Log user management event
   */
  logUserEvent(event: {
    userId: string;
    userEmail: string;
    action:
      | 'user_created'
      | 'user_updated'
      | 'user_deleted'
      | 'user_restored'
      | 'role_changed';
    changes?: Record<string, unknown>;
    status: AuditStatus;
    performedBy?: string;
  }): void {
    this.logger.log(
      `[AUDIT] ${event.action.toUpperCase()} - User: ${event.userEmail} (${event.userId}) - ${event.status}`,
    );

    this.persist({
      userId: event.userId,
      userEmail: event.userEmail,
      action: event.action,
      resourceType: 'user',
      resourceId: event.userId,
      changes: event.changes ?? null,
      status: event.status,
      reason: null,
      ipAddress: null,
    });
  }

  /**
   * Write without blocking the caller.
   *
   * Both log methods are called from the middle of authentication and user
   * management flows, and neither is awaited. Surfacing a write failure there
   * would let a database hiccup turn a successful login into a 500, so the
   * failure is logged loudly and swallowed instead — the logger line above has
   * already recorded the event either way.
   */
  private persist(log: Partial<AuditLog>): void {
    void this.auditLogRepository
      .save(this.auditLogRepository.create(log))
      .catch((error: unknown) => {
        this.logger.error(
          `Failed to persist audit log (${log.action} / ${log.status})`,
          error instanceof Error ? error.stack : String(error),
        );
      });
  }

  /**
   * Page through the trail, newest first.
   */
  async findLogs(filter: AuditLogFilter = {}): Promise<{
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 50;

    const where: FindOptionsWhere<AuditLog> = {};
    if (filter.action) where.action = filter.action;
    if (filter.status) where.status = filter.status;
    if (filter.userId) where.userId = filter.userId;
    if (filter.userEmail) where.userEmail = filter.userEmail;

    if (filter.from && filter.to) {
      where.timestamp = Between(filter.from, filter.to);
    } else if (filter.from) {
      where.timestamp = MoreThanOrEqual(filter.from);
    } else if (filter.to) {
      where.timestamp = LessThanOrEqual(filter.to);
    }

    const [data, total] = await this.auditLogRepository.findAndCount({
      where,
      order: { timestamp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  /**
   * Failed login attempts grouped by address, busiest first.
   *
   * Aggregated in the database rather than by loading rows and counting in
   * memory — the whole point of persisting the trail is that it outgrows what
   * the process can hold.
   */
  async getFailedLoginAttempts(hourLimit = 24): Promise<FailedLoginSummary[]> {
    const cutoff = new Date(Date.now() - hourLimit * 60 * 60 * 1000);

    const rows = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.userEmail', 'email')
      .addSelect('COUNT(*)', 'count')
      .addSelect('MAX(log.timestamp)', 'lastAttempt')
      .where('log.action = :action', { action: 'login' })
      .andWhere('log.status = :status', { status: 'failure' })
      .andWhere('log.timestamp > :cutoff', { cutoff })
      .andWhere('log.userEmail IS NOT NULL')
      .groupBy('log.userEmail')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany<{ email: string; count: string; lastAttempt: Date }>();

    return rows.map((row) => ({
      email: row.email,
      // COUNT() comes back as a string from the pg driver.
      count: parseInt(row.count, 10),
      lastAttempt: row.lastAttempt,
    }));
  }
}
