import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Record who performed a user-management action, not only who it was
 * performed on.
 *
 * AuditService.logUserEvent already accepted a `performedBy` argument and
 * dropped it on the floor, so the trail could say an account was deleted but
 * never by whom — the first question anyone reviewing it asks.
 *
 * Existing rows keep NULL: that information was never captured and
 * backfilling a guess into an audit trail would be worse than leaving the gap
 * visible.
 */
export class AddAuditPerformedBy1791213480000 implements MigrationInterface {
  name = 'AddAuditPerformedBy1791213480000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
        ADD COLUMN IF NOT EXISTS "performedBy" character varying,
        ADD COLUMN IF NOT EXISTS "performedByEmail" character varying
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_performed_by"
        ON "audit_logs" ("performedBy")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_audit_logs_performed_by"`,
    );
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
        DROP COLUMN IF EXISTS "performedByEmail",
        DROP COLUMN IF EXISTS "performedBy"
    `);
  }
}
