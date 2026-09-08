import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';

/**
 * AuditService itself is provided by the global CommonModule, since the
 * authentication and user flows write to it. This module only adds the
 * read-side HTTP surface.
 */
@Module({
  controllers: [AuditController],
})
export class AuditModule {}
