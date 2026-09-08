import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from '../../audit/entities/audit-log.entity';

/** Let the fire-and-forget persist() settle before asserting on it. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('AuditService', () => {
  let service: AuditService;
  interface FindArgs {
    where: Record<string, unknown>;
  }
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    findAndCount: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let queryBuilder: Record<string, jest.Mock>;

  /** Cast the call list before indexing, so nothing lands on `any`. */
  const lastFindArgs = (): FindArgs => {
    const calls = repository.findAndCount.mock.calls as Array<[FindArgs]>;
    return calls[0][0];
  };
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    queryBuilder = {
      select: jest.fn(),
      addSelect: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
      groupBy: jest.fn(),
      orderBy: jest.fn(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    // Every builder method except the terminal one is chainable.
    for (const [name, fn] of Object.entries(queryBuilder)) {
      if (name !== 'getRawMany') fn.mockReturnValue(queryBuilder);
    }

    repository = {
      create: jest.fn((input: unknown) => input),
      save: jest.fn().mockResolvedValue({}),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: repository },
      ],
    }).compile();

    service = module.get(AuditService);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('logAuthEvent', () => {
    it('should persist the event', async () => {
      service.logAuthEvent({
        email: 'a@example.com',
        action: 'login',
        status: 'failure',
        reason: 'Invalid credentials',
        ipAddress: '203.0.113.7',
      });
      await flush();

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userEmail: 'a@example.com',
          action: 'login',
          resourceType: 'auth',
          status: 'failure',
          reason: 'Invalid credentials',
          ipAddress: '203.0.113.7',
        }),
      );
    });

    it('should not throw when the write fails', async () => {
      repository.save.mockRejectedValue(new Error('connection terminated'));

      // The caller is mid-login and does not await this. If the rejection
      // escaped, a database hiccup would turn a valid login into a 500.
      expect(() =>
        service.logAuthEvent({
          email: 'a@example.com',
          action: 'login',
          status: 'success',
        }),
      ).not.toThrow();
      await flush();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to persist audit log'),
        expect.any(String),
      );
    });
  });

  describe('logUserEvent', () => {
    it('should persist the event with its changes', async () => {
      service.logUserEvent({
        userId: 'u1',
        userEmail: 'b@example.com',
        action: 'role_changed',
        changes: { from: 'user', to: 'admin' },
        status: 'success',
      });
      await flush();

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          action: 'role_changed',
          resourceType: 'user',
          changes: { from: 'user', to: 'admin' },
        }),
      );
    });
  });

  describe('findLogs', () => {
    it('should default to the newest 50', async () => {
      await service.findLogs();

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          order: { timestamp: 'DESC' },
          skip: 0,
          take: 50,
        }),
      );
    });

    it('should translate filters and paging', async () => {
      await service.findLogs({
        action: 'login',
        status: 'failure',
        userEmail: 'a@example.com',
        page: 3,
        limit: 10,
      });

      expect(repository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            action: 'login',
            status: 'failure',
            userEmail: 'a@example.com',
          },
          skip: 20,
          take: 10,
        }),
      );
    });

    it('should build a range when both bounds are given', async () => {
      const from = new Date('2026-01-01T00:00:00Z');
      const to = new Date('2026-02-01T00:00:00Z');

      await service.findLogs({ from, to });

      expect(lastFindArgs().where.timestamp).toEqual(Between(from, to));
    });

    it('should build an open-ended range from a lower bound alone', async () => {
      const from = new Date('2026-01-01T00:00:00Z');

      await service.findLogs({ from });

      expect(lastFindArgs().where.timestamp).toEqual(MoreThanOrEqual(from));
    });

    it('should build an open-ended range from an upper bound alone', async () => {
      const to = new Date('2026-02-01T00:00:00Z');

      await service.findLogs({ to });

      expect(lastFindArgs().where.timestamp).toEqual(LessThanOrEqual(to));
    });

    it('should not constrain the timestamp when no bound is given', async () => {
      await service.findLogs({ action: 'login' });

      expect(lastFindArgs().where.timestamp).toBeUndefined();
    });
  });

  describe('getFailedLoginAttempts', () => {
    it('should aggregate in the database and coerce the count', async () => {
      const lastAttempt = new Date('2026-09-08T10:00:00Z');
      queryBuilder.getRawMany.mockResolvedValue([
        { email: 'noisy@example.com', count: '7', lastAttempt },
      ]);

      const result = await service.getFailedLoginAttempts(12);

      expect(result).toEqual([
        { email: 'noisy@example.com', count: 7, lastAttempt },
      ]);
      // pg returns COUNT() as a string; a raw pass-through would break sorting
      // and comparisons downstream.
      expect(typeof result[0].count).toBe('number');
    });

    it('should apply the requested time window', async () => {
      const before = Date.now();
      await service.getFailedLoginAttempts(6);

      const calls = queryBuilder.andWhere.mock.calls as Array<
        [string, unknown]
      >;
      const cutoffCall = calls.find(([clause]) => clause.includes('cutoff'));
      const { cutoff } = cutoffCall![1] as { cutoff: Date };
      expect(cutoff.getTime()).toBeLessThanOrEqual(before - 6 * 3600 * 1000);
    });
  });
});
