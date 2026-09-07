import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ApiInfo {
  name: string;
  environment: string;
  documentation: string | null;
  health: string;
}

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Service metadata for the API root. Deliberately limited to what a client
   * needs in order to navigate: no versions, dependency lists or build
   * details, which only help someone matching the deployment to a CVE.
   */
  getApiInfo(): ApiInfo {
    const swaggerEnabled =
      this.configService.get<boolean>('swagger.enabled') ?? false;

    return {
      name: 'API Auth & User Management',
      environment: this.configService.get<string>('nodeEnv') ?? 'development',
      documentation: swaggerEnabled ? '/api/docs' : null,
      health: '/api/v1/health',
    };
  }
}
