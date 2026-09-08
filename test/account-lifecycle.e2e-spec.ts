import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { App } from 'supertest/types';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from './../src/app.module';
import { User, UserRole } from '../src/users/entities/user.entity';

/**
 * Delete → reuse the address → restore, over the real HTTP stack.
 *
 * As in the lockout suite, every request carries its own forwarded address so
 * the per-IP throttle never fires; the behaviour under test is unrelated to
 * rate limiting.
 */
describe('Account lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let usersRepository: Repository<User>;

  const suffix = Math.random().toString(36).substring(2, 8);
  const adminEmail = `e2e-admin-${suffix}@example.com`;
  const victimEmail = `e2e-victim-${suffix}@example.com`;
  const password = 'Password123!';

  let adminToken: string;
  let victimId: string;
  let replacementId: string;

  let ipCounter = 0;
  const nextIp = () => `198.51.100.${(ipCounter++ % 250) + 1}`;

  const post = (path: string) =>
    request(app.getHttpServer()).post(path).set('X-Forwarded-For', nextIp());
  const get = (path: string) =>
    request(app.getHttpServer()).get(path).set('X-Forwarded-For', nextIp());
  const del = (path: string) =>
    request(app.getHttpServer()).delete(path).set('X-Forwarded-For', nextIp());

  const register = (email: string) =>
    post('/api/v1/auth/register').send({ email, password });

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

    const admin = await register(adminEmail).expect(201);
    adminToken = (admin.body as { access_token: string }).access_token;
    // Registration always creates a plain user; promotion is an admin action.
    // The strategy reads the role from the database, so the token still works.
    await usersRepository.update(
      { email: adminEmail },
      { role: UserRole.ADMIN },
    );

    await register(victimEmail).expect(201);
    const victim = await usersRepository.findOne({
      where: { email: victimEmail },
    });
    victimId = victim!.id;
  });

  afterAll(async () => {
    await usersRepository.delete({ email: adminEmail });
    await usersRepository.delete({ email: victimEmail });
    await app.close();
  });

  const asAdmin = <T extends request.Test>(req: T) =>
    req.set('Authorization', `Bearer ${adminToken}`);

  it('soft-deletes the account', async () => {
    await asAdmin(del(`/api/v1/users/${victimId}`)).expect(200);

    const row = await usersRepository.findOne({
      where: { id: victimId },
      withDeleted: true,
    });
    expect(row?.deletedAt).toBeInstanceOf(Date);
  });

  it('answers 404 for the deleted account rather than an empty 200', async () => {
    await asAdmin(get(`/api/v1/users/${victimId}`)).expect(404);
  });

  it('frees the address for a new registration', async () => {
    // The whole point of the partial unique index: a deleted account must not
    // keep an address reserved forever.
    const response = await register(victimEmail).expect(201);
    expect(response.body).toHaveProperty('access_token');

    const replacement = await usersRepository.findOne({
      where: { email: victimEmail },
    });
    replacementId = replacement!.id;
    expect(replacementId).not.toBe(victimId);
  });

  it('refuses to restore into an address that is now taken', async () => {
    const response = await asAdmin(
      post(`/api/v1/users/${victimId}/restore`),
    ).expect(409);

    expect(JSON.stringify(response.body)).toContain('active account');
  });

  it('restores once the address is free again', async () => {
    await asAdmin(del(`/api/v1/users/${replacementId}`)).expect(200);

    const response = await asAdmin(
      post(`/api/v1/users/${victimId}/restore`),
    ).expect(200);
    expect(response.body).toMatchObject({ id: victimId, email: victimEmail });

    await asAdmin(get(`/api/v1/users/${victimId}`)).expect(200);
  });

  it('rejects restoring an account that was never deleted', async () => {
    await asAdmin(post(`/api/v1/users/${victimId}/restore`)).expect(400);
  });

  it('requires the admin role to restore', async () => {
    const plain = await register(`e2e-plain-${suffix}@example.com`).expect(201);
    const token = (plain.body as { access_token: string }).access_token;

    await post(`/api/v1/users/${victimId}/restore`)
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    await usersRepository.delete({ email: `e2e-plain-${suffix}@example.com` });
  });

  it('requires authentication to restore', async () => {
    await post(`/api/v1/users/${victimId}/restore`).expect(401);
  });
});
