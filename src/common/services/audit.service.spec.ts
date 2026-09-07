import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(() => {
    service = new AuditService();
    jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined);
  });

  const logFailure = (email: string) =>
    service.logAuthEvent({ email, action: 'login', status: 'failure' });

  describe('buffering', () => {
    it('should keep entries below the cap', () => {
      logFailure('a@example.com');
      logFailure('b@example.com');

      expect(service.getLogs()).toHaveLength(2);
      expect(service.getDroppedLogCount()).toBe(0);
    });

    it('should evict the oldest entries instead of growing without bound', () => {
      const overflow = 5;
      for (let i = 0; i < AuditService.MAX_BUFFERED_LOGS + overflow; i++) {
        logFailure(`user-${i}@example.com`);
      }

      const logs = service.getLogs();
      expect(logs).toHaveLength(AuditService.MAX_BUFFERED_LOGS);
      expect(service.getDroppedLogCount()).toBe(overflow);
      // The first `overflow` entries are the ones that went.
      expect(logs[0]?.userEmail).toBe(`user-${overflow}@example.com`);
      expect(logs[logs.length - 1]?.userEmail).toBe(
        `user-${AuditService.MAX_BUFFERED_LOGS + overflow - 1}@example.com`,
      );
    });
  });

  describe('getLogs', () => {
    it('should filter by action and status', () => {
      logFailure('a@example.com');
      service.logAuthEvent({
        email: 'b@example.com',
        action: 'login',
        status: 'success',
      });
      service.logUserEvent({
        userId: 'u1',
        userEmail: 'c@example.com',
        action: 'user_created',
        status: 'success',
      });

      expect(service.getLogs({ action: 'login' })).toHaveLength(2);
      expect(service.getLogs({ status: 'failure' })).toHaveLength(1);
      expect(service.getLogs({ userId: 'u1' })).toHaveLength(1);
    });
  });

  describe('getFailedLoginAttempts', () => {
    it('should aggregate failures per email, most frequent first', () => {
      logFailure('noisy@example.com');
      logFailure('noisy@example.com');
      logFailure('quiet@example.com');

      const attempts = service.getFailedLoginAttempts();

      expect(attempts).toEqual([
        expect.objectContaining({ email: 'noisy@example.com', count: 2 }),
        expect.objectContaining({ email: 'quiet@example.com', count: 1 }),
      ]);
    });

    it('should ignore failures outside the time window', () => {
      logFailure('old@example.com');
      const logs = service.getLogs();
      logs[0].timestamp = new Date(Date.now() - 48 * 60 * 60 * 1000);

      expect(service.getFailedLoginAttempts(24)).toHaveLength(0);
    });
  });
});
