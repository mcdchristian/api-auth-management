import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replace the unconditional email uniqueness constraint with one that ignores
 * soft-deleted rows.
 *
 * Deleting a user set `deletedAt` but left the row in place, so the plain
 * UNIQUE constraint kept holding their address. The account was unreachable
 * through the API and the address was unusable by anyone, permanently.
 */
export class ScopeEmailUniquenessToLiveRows1788825600000 implements MigrationInterface {
  name = 'ScopeEmailUniquenessToLiveRows1788825600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_users_email"
    `);
    // Older databases built by synchronize may carry TypeORM's generated name
    // instead of the one the baseline migration declares.
    await queryRunner.query(`
      DO $$
      DECLARE constraint_name text;
      BEGIN
        SELECT conname INTO constraint_name
          FROM pg_constraint
          WHERE conrelid = 'users'::regclass
            AND contype = 'u'
            AND pg_get_constraintdef(oid) = 'UNIQUE ("email")';
        IF constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE "users" DROP CONSTRAINT %I', constraint_name);
        END IF;
      END $$
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_email_active"
        ON "users" ("email")
        WHERE "deletedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_email_active"`);
    // Fails if any address is now held by both a live and a deleted row —
    // exactly the state this migration made reachable. Resolve the duplicates
    // before rolling back.
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "UQ_users_email" UNIQUE ("email")
    `);
  }
}
