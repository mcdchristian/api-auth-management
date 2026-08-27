import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { Repository } from 'typeorm';
import { User } from '../src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('App & Authentication (e2e)', () => {
  let app: INestApplication<App>;
  let usersRepository: Repository<User>;
  const uniqueSuffix = Math.random().toString(36).substring(2, 8);
  const testEmail = `e2e-${uniqueSuffix}@example.com`;
  const testPassword = 'Password123!';
  let accessToken: string;
  let refreshToken: string;
  let createdUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
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
  });

  afterAll(async () => {
    if (createdUserId) {
      await usersRepository.delete({ id: createdUserId });
    }
    await app.close();
  });

  it('/api/v1 (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('Hello World!');
  });

  describe('/auth (endpoints)', () => {
    it('POST /api/v1/auth/register - success', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');

      const user = await usersRepository.findOne({
        where: { email: testEmail },
      });
      expect(user).toBeDefined();
      if (user) {
        createdUserId = user.id;
      }
    });

    it('POST /api/v1/auth/register - failure (duplicate email)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(409);
    });

    it('POST /api/v1/auth/register - failure (invalid password)', async () => {
      const badEmail = `e2e-bad-${uniqueSuffix}@example.com`;
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: badEmail,
          password: '123',
        })
        .expect(400);
    });

    it('POST /api/v1/auth/login - success', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');

      const tokens = response.body as {
        access_token: string;
        refresh_token: string;
      };
      accessToken = tokens.access_token;
      refreshToken = tokens.refresh_token;
    });

    it('POST /api/v1/auth/login - failure (incorrect password)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'wrongPassword',
        })
        .expect(401);
    });

    it('POST /api/v1/auth/refresh - success', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');

      const tokens = response.body as {
        access_token: string;
        refresh_token: string;
      };
      accessToken = tokens.access_token;
      refreshToken = tokens.refresh_token;
    });
  });

  describe('/users (endpoints)', () => {
    it('GET /api/v1/users/profile - success (authenticated)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('email', testEmail);
      expect(response.body).toHaveProperty('isActive', true);
    });

    it('GET /api/v1/users/profile - failure (unauthorized)', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .expect(401);
    });

    it('PATCH /api/v1/users/profile - success (normalize & update email)', async () => {
      const updatedEmail = `E2E-UPDATED-${uniqueSuffix}@example.com `;
      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: updatedEmail,
        })
        .expect(200);

      const expectedEmail = updatedEmail.toLowerCase().trim();
      expect(response.body).toHaveProperty('email', expectedEmail);
    });
  });

  describe('/auth/logout', () => {
    it('POST /api/v1/auth/logout - success', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: refreshToken,
        })
        .expect(403);
    });
  });
});
