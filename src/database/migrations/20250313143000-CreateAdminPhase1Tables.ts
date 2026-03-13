import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Creates all tables required for Admin Auth, Driver Management, and Ambulance Management APIs.
 * Aligns with One Click Ambulance project plan (plan.md) Phase 1.
 *
 * Tables: users, admin_users, drivers, driver_documents, driver_bank_accounts,
 *         audit_logs, ambulance_types, ambulances, ambulance_equipment
 */
export class CreateAdminPhase1Tables20250313143000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid-ossp for PostgreSQL (must be first, before any uuid columns)
    const isMySQL =
      queryRunner.connection.options.type === 'mysql' ||
      queryRunner.connection.options.type === 'mariadb';

    if (!isMySQL) {
      await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    }

    // ─── 1. users ─────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isPrimary: true,
            generationStrategy: isMySQL ? undefined : 'uuid',
            default: isMySQL ? undefined : 'uuid_generate_v4()',
          },
          {
            name: 'mobile_number',
            type: 'varchar',
            length: '20',
            isUnique: true,
          },
          { name: 'name', type: 'varchar', length: '255', isNullable: true },
          { name: 'email', type: 'varchar', length: '255', isNullable: true },
          {
            name: 'profile_photo_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'is_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_blocked',
            type: 'boolean',
            default: false,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '50',
            default: "'user'",
          },
          {
            name: 'fcm_token',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'device_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: isMySQL ? 'datetime' : 'timestamp',
            default: isMySQL ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: isMySQL ? 'datetime' : 'timestamp',
            default: isMySQL
              ? 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
              : 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // ─── 2. admin_users ───────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'admin_users',
        columns: [
          {
            name: 'id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isPrimary: true,
            generationStrategy: isMySQL ? undefined : 'uuid',
            default: isMySQL ? undefined : 'uuid_generate_v4()',
          },
          { name: 'email', type: 'varchar', length: '255', isUnique: true },
          { name: 'password_hash', type: 'varchar', length: '255' },
          { name: 'name', type: 'varchar', length: '255' },
          {
            name: 'admin_role',
            type: 'varchar',
            length: '50',
            default: "'support'",
          },
          {
            name: 'role',
            type: 'varchar',
            length: '50',
            default: "'admin'",
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'last_login',
            type: isMySQL ? 'datetime' : 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: isMySQL ? 'datetime' : 'timestamp',
            default: isMySQL ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // ─── 3. drivers ───────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'drivers',
        columns: [
          {
            name: 'id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isPrimary: true,
            generationStrategy: isMySQL ? undefined : 'uuid',
            default: isMySQL ? undefined : 'uuid_generate_v4()',
          },
          {
            name: 'mobile_number',
            type: 'varchar',
            length: '20',
            isUnique: true,
          },
          { name: 'name', type: 'varchar', length: '255', isNullable: true },
          { name: 'email', type: 'varchar', length: '255', isNullable: true },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
          },
          {
            name: 'role',
            type: 'varchar',
            length: '50',
            default: "'driver'",
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
          },
          {
            name: 'total_rides',
            type: 'int',
            default: 0,
          },
          {
            name: 'is_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_online',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_blocked',
            type: 'boolean',
            default: false,
          },
          {
            name: 'fcm_token',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'device_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: isMySQL ? 'datetime' : 'timestamp',
            default: isMySQL ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: isMySQL ? 'datetime' : 'timestamp',
            default: isMySQL
              ? 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
              : 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // ─── 4. ambulance_types ────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'ambulance_types',
        columns: [
          {
            name: 'id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isPrimary: true,
            generationStrategy: isMySQL ? undefined : 'uuid',
            default: isMySQL ? undefined : 'uuid_generate_v4()',
          },
          { name: 'name', type: 'varchar', length: '255', isUnique: true },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: isMySQL ? 'datetime' : 'timestamp',
            default: isMySQL ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // ─── 5. driver_documents ──────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'driver_documents',
        columns: [
          {
            name: 'id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isPrimary: true,
            generationStrategy: isMySQL ? undefined : 'uuid',
            default: isMySQL ? undefined : 'uuid_generate_v4()',
          },
          {
            name: 'driver_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          {
            name: 'document_type',
            type: 'varchar',
            length: '50',
          },
          { name: 'document_url', type: 'varchar', length: '500' },
          {
            name: 'verification_status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
          },
          {
            name: 'created_at',
            type: isMySQL ? 'datetime' : 'timestamp',
            default: isMySQL ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'driver_documents',
      new TableForeignKey({
        columnNames: ['driver_id'],
        referencedTableName: 'drivers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'driver_documents',
      new TableIndex({
        name: 'IDX_driver_documents_driver_id',
        columnNames: ['driver_id'],
      }),
    );

    // ─── 6. driver_bank_accounts ──────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'driver_bank_accounts',
        columns: [
          {
            name: 'id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isPrimary: true,
            generationStrategy: isMySQL ? undefined : 'uuid',
            default: isMySQL ? undefined : 'uuid_generate_v4()',
          },
          {
            name: 'driver_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          { name: 'bank_name', type: 'varchar', length: '255' },
          { name: 'account_number', type: 'varchar', length: '255' },
          { name: 'ifsc_code', type: 'varchar', length: '50' },
          {
            name: 'account_holder_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: isMySQL ? 'datetime' : 'timestamp',
            default: isMySQL ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'driver_bank_accounts',
      new TableForeignKey({
        columnNames: ['driver_id'],
        referencedTableName: 'drivers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'driver_bank_accounts',
      new TableIndex({
        name: 'IDX_driver_bank_accounts_driver_id',
        columnNames: ['driver_id'],
      }),
    );

    // ─── 7. audit_logs ────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isPrimary: true,
            generationStrategy: isMySQL ? undefined : 'uuid',
            default: isMySQL ? undefined : 'uuid_generate_v4()',
          },
          {
            name: 'admin_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          { name: 'action', type: 'varchar', length: '100' },
          {
            name: 'entity_type',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'entity_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: isMySQL ? 'json' : 'jsonb',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: isMySQL ? 'datetime' : 'timestamp',
            default: isMySQL ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_admin_id',
        columnNames: ['admin_id'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_entity',
        columnNames: ['entity_type', 'entity_id'],
      }),
    );

    // ─── 8. ambulances ─────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'ambulances',
        columns: [
          {
            name: 'id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isPrimary: true,
            generationStrategy: isMySQL ? undefined : 'uuid',
            default: isMySQL ? undefined : 'uuid_generate_v4()',
          },
          {
            name: 'driver_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          {
            name: 'ambulance_type_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          {
            name: 'registration_number',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'vehicle_number',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'photo_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'insurance_expiry',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
          },
          {
            name: 'suspend_reason',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: isMySQL ? 'datetime' : 'timestamp',
            default: isMySQL ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: isMySQL ? 'datetime' : 'timestamp',
            default: isMySQL
              ? 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
              : 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'ambulances',
      new TableForeignKey({
        columnNames: ['driver_id'],
        referencedTableName: 'drivers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'ambulances',
      new TableForeignKey({
        columnNames: ['ambulance_type_id'],
        referencedTableName: 'ambulance_types',
        referencedColumnNames: ['id'],
      }),
    );

    await queryRunner.createIndex(
      'ambulances',
      new TableIndex({
        name: 'IDX_ambulances_driver_id',
        columnNames: ['driver_id'],
      }),
    );

    await queryRunner.createIndex(
      'ambulances',
      new TableIndex({
        name: 'IDX_ambulances_ambulance_type_id',
        columnNames: ['ambulance_type_id'],
      }),
    );

    // ─── 9. ambulance_equipment ────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'ambulance_equipment',
        columns: [
          {
            name: 'id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isPrimary: true,
            generationStrategy: isMySQL ? undefined : 'uuid',
            default: isMySQL ? undefined : 'uuid_generate_v4()',
          },
          {
            name: 'ambulance_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          { name: 'name', type: 'varchar', length: '255' },
          {
            name: 'created_at',
            type: isMySQL ? 'datetime' : 'timestamp',
            default: isMySQL ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'ambulance_equipment',
      new TableForeignKey({
        columnNames: ['ambulance_id'],
        referencedTableName: 'ambulances',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'ambulance_equipment',
      new TableIndex({
        name: 'IDX_ambulance_equipment_ambulance_id',
        columnNames: ['ambulance_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order (respecting FK constraints)
    await queryRunner.dropTable('ambulance_equipment', true);
    await queryRunner.dropTable('ambulances', true);
    await queryRunner.dropTable('audit_logs', true);
    await queryRunner.dropTable('driver_bank_accounts', true);
    await queryRunner.dropTable('driver_documents', true);
    await queryRunner.dropTable('ambulance_types', true);
    await queryRunner.dropTable('drivers', true);
    await queryRunner.dropTable('admin_users', true);
    await queryRunner.dropTable('users', true);
  }
}
