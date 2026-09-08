import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from './../src/app.module';
import { User, UserRole } from '../src/users/entities/user.entity';
import { AuditLog } from '../src/audit/entities/audit-log.entity';

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

describe('Audit trail (e2e)', () => {
  let app: INestApplication<App>;
  let usersRepository: Repository<User>;
  let auditRepository: Repository<AuditLog>;

  const suffix = Math.random().toString(36).substring(2, 8);
  const adminEmail = `e2e-audit-admin-${suffix}@example.com`;
  const targetEmail = `e2e-audit-target-${suffix}@example.com`;
  const password = 'Password123!';
  const wrongPassword = 'WrongPassword1!';
  const failedAttempts = 3;

  let adminToken: string;
  let plainToken: string;

  let ipCounter = 0;
  const nextIp = () => `192.0.2.${(ipCounter++ % 250) + 1}`;
  const post = (path: string) =>
    request(app.getHttpServer()).post(path).set('X-Forwarded-For', nextIp());
  const get = (path: string) =>
    request(app.getHttpServer()).get(path).set('X-Forwarded-For', nextIp());
  const asAdmin = <T extends request.Test>(req: T) =>
    req.set('Authorization', `Bearer ${adminToken}`);

  /**
   * Audit writes are deliberately not awaited by the request that triggers
   * them, so a read immediately afterwards can outrun the insert. Poll rather
   * than sleep a fixed amount.
   */
  const waitForRows = async (expected: number): Promise<number> => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const count = await auditRepository.count({
        where: { userEmail: targetEmail, action: 'login', status: 'failure' },
      });
      if (count >= expected) return count;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return -1;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    (app as NestExpressApplication).set('trust proxy', true);
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    usersRepository = app.get<Repository<User>>(getRepositoryToken(User));
    auditRepository = app.get<Repository<AuditLog>>(
      getRepositoryToken(AuditLog),
    );

    const admin = await post('/api/v1/auth/register')
      .send({ email: adminEmail, password })
      .expect(201);
    adminToken = (admin.body as { access_token: string }).access_token;
    await usersRepository.update(
      { email: adminEmail },
      { role: UserRole.ADMIN },
    );

    const plain = await post('/api/v1/auth/register')
      .send({ email: targetEmail, password })
      .expect(201);
    plainToken = (plain.body as { access_token: string }).access_token;

    for (let i = 0; i < failedAttempts; i++) {
      await post('/api/v1/auth/login')
        .send({ email: targetEmail, password: wrongPassword })
        .expect(401);
    }
    expect(await waitForRows(failedAttempts)).toBeGreaterThanOrEqual(
      failedAttempts,
    );
  });

  afterAll(async () => {
    await auditRepository.delete({ userEmail: adminEmail });
    await auditRepository.delete({ userEmail: targetEmail });
    await usersRepository.delete({ email: adminEmail });
    await usersRepository.delete({ email: targetEmail });
    await app.close();
  });

  describe('access control', () => {
    it('rejects an anonymous caller', async () => {
      await get('/api/v1/audit/logs').expect(401);
      await get('/api/v1/audit/failed-logins').expect(401);
    });

    it('rejects a non-admin', async () => {
      await get('/api/v1/audit/logs')
        .set('Authorization', `Bearer ${plainToken}`)
        .expect(403);
    });
  });

  describe('GET /audit/logs', () => {
    it('returns a paginated page, newest first', async () => {
      const response = await asAdmin(
        get(`/api/v1/audit/logs?userEmail=${targetEmail}`),
      ).expect(200);

      const body = response.body as Paginated<AuditLog>;
      expect(body.total).toBeGreaterThanOrEqual(failedAttempts);
      expect(body.page).toBe(1);

      const times = body.data.map((row) => new Date(row.timestamp).getTime());
      expect([...times].sort((a, b) => b - a)).toEqual(times);
    });

    it('filters by action and status', async () => {
      const response = await asAdmin(
        get(
          `/api/v1/audit/logs?userEmail=${targetEmail}&action=login&status=failure`,
        ),
      ).expect(200);

      const body = response.body as Paginated<AuditLog>;
      expect(body.total).toBe(failedAttempts);
      expect(
        body.data.every(
          (row) => row.action === 'login' && row.status === 'failure',
        ),
      ).toBe(true);
    });

    it('records the registration alongside the failures', async () => {
      const response = await asAdmin(
        get(`/api/v1/audit/logs?userEmail=${targetEmail}&action=register`),
      ).expect(200);

      const body = response.body as Paginated<AuditLog>;
      expect(body.total).toBe(1);
      expect(body.data[0]).toMatchObject({
        status: 'success',
        resourceType: 'auth',
      });
    });

    it('honours the page size', async () => {
      const response = await asAdmin(
        get(`/api/v1/audit/logs?userEmail=${targetEmail}&limit=2`),
      ).expect(200);

      expect((response.body as Paginated<AuditLog>).data).toHaveLength(2);
    });

    it('rejects an unknown status', async () => {
      await asAdmin(get('/api/v1/audit/logs?status=maybe')).expect(400);
    });

    it('rejects a page size beyond the cap', async () => {
      await asAdmin(get('/api/v1/audit/logs?limit=500')).expect(400);
    });
  });

  describe('GET /audit/failed-logins', () => {
    it('summarises attempts per address', async () => {
      const response = await asAdmin(get('/api/v1/audit/failed-logins')).expect(
        200,
      );

      const summary = response.body as Array<{
        email: string;
        count: number;
        lastAttempt: string;
      }>;
      const entry = summary.find((row) => row.email === targetEmail);

      expect(entry).toBeDefined();
      expect(entry!.count).toBe(failedAttempts);
      // Aggregated in SQL, where COUNT() arrives as a string.
      expect(typeof entry!.count).toBe('number');
    });

    it('excludes attempts outside the window', async () => {
      await auditRepository.update(
        { userEmail: targetEmail, action: 'login', status: 'failure' },
        { timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      );

      const response = await asAdmin(
        get('/api/v1/audit/failed-logins?hours=24'),
      ).expect(200);

      const summary = response.body as Array<{ email: string }>;
      expect(summary.find((row) => row.email === targetEmail)).toBeUndefined();
    });

    it('rejects a window beyond a week', async () => {
      await asAdmin(get('/api/v1/audit/failed-logins?hours=200')).expect(400);
    });
  });
});
