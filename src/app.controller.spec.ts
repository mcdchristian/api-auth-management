import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  const build = async (config: Record<string, unknown>) => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => config[key] },
        },
      ],
    }).compile();

    return app.get<AppController>(AppController);
  };

  it('should advertise the docs when Swagger is enabled', async () => {
    const controller = await build({
      nodeEnv: 'development',
      'swagger.enabled': true,
    });

    expect(controller.getApiInfo()).toEqual({
      name: 'API Auth & User Management',
      environment: 'development',
      documentation: '/api/docs',
      health: '/api/v1/health',
    });
  });

  it('should not advertise docs that are not being served', async () => {
    const controller = await build({
      nodeEnv: 'production',
      'swagger.enabled': false,
    });

    expect(controller.getApiInfo()).toMatchObject({
      environment: 'production',
      documentation: null,
    });
  });
});
