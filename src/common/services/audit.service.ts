import { Injectable, Logger } from '@nestjs/common';

export interface AuditLog {
  timestamp: Date;
  userId: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  status: 'success' | 'failure';
  reason?: string;
}

/**
 * Service for logging security-sensitive operations (audit trail)
 * Logs all authentication and authorization events
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly auditLogs: AuditLog[] = [];

  constructor() {
    // In production, this should write to a database or external logging service
    // For now, we'll store in memory and also log to console
  }

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
    status: 'success' | 'failure';
    reason?: string;
    ipAddress?: string;
  }): void {
    const log: AuditLog = {
      timestamp: new Date(),
      userId: '', // Will be populated on login success
      userEmail: event.email,
      action: event.action,
      resourceType: 'auth',
      resourceId: event.email,
      status: event.status,
      reason: event.reason,
      ipAddress: event.ipAddress,
    };

    this.auditLogs.push(log);
    this.logger.log(
      `[AUDIT] ${event.action.toUpperCase()} - ${event.email} - ${event.status} ${event.reason ? `- Reason: ${event.reason}` : ''}`,
    );
  }

  /**
   * Log user management event
   */
  logUserEvent(event: {
    userId: string;
    userEmail: string;
    action: 'user_created' | 'user_updated' | 'user_deleted' | 'role_changed';
    changes?: Record<string, unknown>;
    status: 'success' | 'failure';
    performedBy?: string;
  }): void {
    const log: AuditLog = {
      timestamp: new Date(),
      userId: event.userId,
      userEmail: event.userEmail,
      action: event.action,
      resourceType: 'user',
      resourceId: event.userId,
      changes: event.changes,
      status: event.status,
    };

    this.auditLogs.push(log);
    this.logger.log(
      `[AUDIT] ${event.action.toUpperCase()} - User: ${event.userEmail} (${event.userId}) - ${event.status}`,
    );
  }

  /**
   * Get audit logs (with optional filtering)
   */
  getLogs(filter?: {
    action?: string;
    status?: 'success' | 'failure';
    userId?: string;
  }): AuditLog[] {
    if (!filter) {
      return this.auditLogs;
    }

    return this.auditLogs.filter((log) => {
      if (filter.action && log.action !== filter.action) return false;
      if (filter.status && log.status !== filter.status) return false;
      if (filter.userId && log.userId !== filter.userId) return false;
      return true;
    });
  }

  /**
   * Get failed login attempts (security monitoring)
   */
  getFailedLoginAttempts(
    hourLimit = 24,
  ): Array<{ email: string; count: number; lastAttempt: Date }> {
    const cutoffTime = new Date(Date.now() - hourLimit * 60 * 60 * 1000);
    const failed = this.auditLogs.filter(
      (log) =>
        log.action === 'login' &&
        log.status === 'failure' &&
        log.timestamp > cutoffTime,
    );

    const attempts: Record<
      string,
      { email: string; count: number; lastAttempt: Date }
    > = {};
    failed.forEach((log) => {
      const email = log.userEmail || '';
      if (!attempts[email]) {
        attempts[email] = {
          email,
          count: 0,
          lastAttempt: log.timestamp,
        };
      }
      const attempt = attempts[email];
      if (attempt) {
        attempt.count++;
        attempt.lastAttempt = new Date(
          Math.max(attempt.lastAttempt.getTime(), log.timestamp.getTime()),
        );
      }
    });

    return Object.values(attempts).sort((a, b) => b.count - a.count);
  }
}
