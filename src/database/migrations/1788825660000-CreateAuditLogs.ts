import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Durable storage for the audit trail, which until now lived only in a capped
 * in-memory buffer and was discarded on every restart.
 */
export class CreateAuditLogs1788825660000 implements MigrationInterface {
  name = 'CreateAuditLogs1788825660000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId" character varying,
        "userEmail" character varying,
        "action" character varying NOT NULL,
        "resourceType" character varying NOT NULL,
        "resourceId" character varying,
        "changes" jsonb,
        "ipAddress" character varying,
        "status" character varying NOT NULL,
        "reason" text,
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_timestamp"
        ON "audit_logs" ("timestamp")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_action_status_timestamp"
        ON "audit_logs" ("action", "status", "timestamp")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_user_id"
        ON "audit_logs" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Indexes go with the table.
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
  }
}
