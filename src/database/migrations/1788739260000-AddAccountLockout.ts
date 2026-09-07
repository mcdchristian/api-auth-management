import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Columns backing per-account brute-force protection.
 *
 * Partial index: only locked rows are worth indexing, and it keeps the
 * "which accounts are currently locked" lookup cheap for future admin
 * tooling without paying for an entry per user.
 */
export class AddAccountLockout1788739260000 implements MigrationInterface {
  name = 'AddAccountLockout1788739260000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "failedLoginAttempts" integer NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP WITH TIME ZONE
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_locked_until"
        ON "users" ("lockedUntil")
        WHERE "lockedUntil" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_locked_until"`);
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "lockedUntil",
        DROP COLUMN IF EXISTS "failedLoginAttempts"
    `);
  }
}
