import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './services/audit.service';
import { ConfigValidationService } from './services/config-validation.service';
import { AuditLog } from '../audit/entities/audit-log.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditService, ConfigValidationService],
  exports: [AuditService, ConfigValidationService],
})
export class CommonModule {}
