import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import type { ApiInfo } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Service metadata and entry points' })
  @ApiResponse({ status: 200, description: 'API information.' })
  getApiInfo(): ApiInfo {
    return this.appService.getApiInfo();
  }
}
