import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository, IsNull } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from './../src/app.module';
import { User } from '../src/users/entities/user.entity';

/**
 * Every request here arrives from a different forwarded address.
 *
 * That is not a workaround for the 5/min per-IP throttle so much as the
 * threat this feature exists for: a guesser spread across many addresses
 * never trips a per-IP limit, so the only thing standing between it and an
 * account is the per-account counter.
 */
describe('Account lockout (e2e)', () => {
  let app: INestApplication<App>;
  let usersRepository: Repository<User>;

  const suffix = Math.random().toString(36).substring(2, 8);
  const email = `e2e-lockout-${suffix}@example.com`;
  const password = 'Password123!';
  const maxAttempts = 5;

  let attemptCount = 0;

  /** A fresh source address per call, so no per-IP bucket ever fills. */
  const nextIp = () => `203.0.113.${(attemptCount++ % 250) + 1}`;

  const login = (body: { email: string; password: string }) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', nextIp())
      .send(body);

  const loadUser = () =>
    usersRepository.findOne({
      where: { email },
      select: ['id', 'failedLoginAttempts', 'lockedUntil'],
    });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    // Required for X-Forwarded-For to reach the throttler's IP tracker, and
    // what a real deployment behind a load balancer sets anyway.
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

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', nextIp())
      .send({ email, password })
      .expect(201);
  });

  afterAll(async () => {
    await usersRepository.delete({ email });
    await app.close();
  });

  it('rejects each wrong password with 401 up to the threshold', async () => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await login({ email, password: 'WrongPassword1!' }).expect(401);
    }

    const user = await loadUser();
    expect(user?.failedLoginAttempts).toBe(maxAttempts);
    expect(user?.lockedUntil).toBeInstanceOf(Date);
    expect(user!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it('still answers 401, not 403, while the password is wrong', async () => {
    // Reporting the lock here would tell an attacker the address exists.
    const response = await login({ email, password: 'WrongPassword1!' });

    expect(response.status).toBe(401);
    expect(JSON.stringify(response.body)).not.toContain('locked');
  });

  it('does not extend the lock on further wrong attempts', async () => {
    const before = await loadUser();
    await login({ email, password: 'WrongPassword1!' }).expect(401);
    const after = await loadUser();

    expect(after?.failedLoginAttempts).toBe(before?.failedLoginAttempts);
    expect(after?.lockedUntil?.getTime()).toBe(before?.lockedUntil?.getTime());
  });

  it('refuses the correct password with 403 while locked', async () => {
    const response = await login({ email, password }).expect(403);

    expect(JSON.stringify(response.body)).toContain('locked');
  });

  it('accepts the correct password once the lock expires and clears the counter', async () => {
    await usersRepository.update(
      { email },
      { lockedUntil: new Date(Date.now() - 1000) },
    );

    const response = await login({ email, password }).expect(200);
    expect(response.body).toHaveProperty('access_token');

    const user = await loadUser();
    expect(user?.failedLoginAttempts).toBe(0);
    expect(user?.lockedUntil).toBeNull();
  });

  it('leaves unrelated accounts untouched', async () => {
    const locked = await usersRepository.count({
      where: { email, lockedUntil: IsNull() },
    });

    expect(locked).toBe(1);
  });
});
