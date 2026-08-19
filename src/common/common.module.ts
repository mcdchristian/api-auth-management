import { Module, Global } from '@nestjs/common';
import { AuditService } from './services/audit.service';
import { ConfigValidationService } from './services/config-validation.service';

@Global()
@Module({
  providers: [AuditService, ConfigValidationService],
  exports: [AuditService, ConfigValidationService],
})
export class CommonModule {}
