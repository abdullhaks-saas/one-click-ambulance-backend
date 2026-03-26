import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Phase 6 notifications, Phase 9/10 foundations, fraud flag columns,
 * support, app versions, system settings, error logs.
 */
export class Phases6910NotificationsFraudReportsSystem20250325140000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isMySQL =
      queryRunner.connection.options.type === 'mysql' ||
      queryRunner.connection.options.type === 'mariadb';

    /** MySQL requires quoted literals for varchar defaults (not bare keywords). */
    const strDef = (value: string) => `'${value.replace(/'/g, "''")}'`;

    const jsonType = isMySQL ? 'json' : 'jsonb';
    const tsType = isMySQL ? 'datetime' : 'timestamp';
    const textType = isMySQL ? 'longtext' : 'text';

    /**
     * Recover from a failed previous run (migration not recorded but objects exist).
     */
    if (isMySQL) {
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
      await queryRunner.query('DROP TABLE IF EXISTS `ticket_messages`');
      await queryRunner.query('DROP TABLE IF EXISTS `notification_logs`');
      await queryRunner.query('DROP TABLE IF EXISTS `support_tickets`');
      await queryRunner.query('DROP TABLE IF EXISTS `notifications`');
      await queryRunner.query('DROP TABLE IF EXISTS `app_versions`');
      await queryRunner.query('DROP TABLE IF EXISTS `error_logs`');
      await queryRunner.query('DROP TABLE IF EXISTS `system_settings`');
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
    } else {
      await queryRunner.query('DROP TABLE IF EXISTS ticket_messages CASCADE');
      await queryRunner.query('DROP TABLE IF EXISTS notification_logs CASCADE');
      await queryRunner.query('DROP TABLE IF EXISTS support_tickets CASCADE');
      await queryRunner.query('DROP TABLE IF EXISTS notifications CASCADE');
      await queryRunner.query('DROP TABLE IF EXISTS app_versions CASCADE');
      await queryRunner.query('DROP TABLE IF EXISTS error_logs CASCADE');
      await queryRunner.query('DROP TABLE IF EXISTS system_settings CASCADE');
    }

    await queryRunner.createTable(
      new Table({
        name: 'notifications',
        columns: [
          {
            name: 'id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isPrimary: true,
            generationStrategy: isMySQL ? undefined : 'uuid',
            default: isMySQL ? undefined : 'uuid_generate_v4()',
          },
          { name: 'title', type: 'varchar', length: '255' },
          { name: 'body', type: textType },
          { name: 'data', type: jsonType, isNullable: true },
          { name: 'audience', type: 'varchar', length: '50' },
          {
            name: 'created_by_admin_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isNullable: true,
          },
          {
            name: 'created_at',
            type: tsType,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'notifications',
      new TableForeignKey({
        columnNames: ['created_by_admin_id'],
        referencedTableName: 'admin_users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'notification_logs',
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
            name: 'notification_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isNullable: true,
          },
          { name: 'recipient_type', type: 'varchar', length: '20' },
          {
            name: 'recipient_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isNullable: true,
          },
          { name: 'fcm_token', type: textType, isNullable: true },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: strDef('failed'),
          },
          { name: 'error_message', type: textType, isNullable: true },
          {
            name: 'created_at',
            type: tsType,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'notification_logs',
      new TableForeignKey({
        columnNames: ['notification_id'],
        referencedTableName: 'notifications',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'notification_logs',
      new TableIndex({
        name: 'IDX_notification_logs_notification_id',
        columnNames: ['notification_id'],
      }),
    );

    await queryRunner.createIndex(
      'notification_logs',
      new TableIndex({
        name: 'IDX_notification_logs_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'system_settings',
        columns: [
          {
            name: 'id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isPrimary: true,
            generationStrategy: isMySQL ? undefined : 'uuid',
            default: isMySQL ? undefined : 'uuid_generate_v4()',
          },
          { name: 'key', type: 'varchar', length: '191', isUnique: true },
          { name: 'value', type: textType },
          {
            name: 'updated_at',
            type: tsType,
            default: 'CURRENT_TIMESTAMP',
            ...(isMySQL ? { onUpdate: 'CURRENT_TIMESTAMP' } : {}),
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'error_logs',
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
            name: 'level',
            type: 'varchar',
            length: '20',
            default: strDef('error'),
          },
          { name: 'message', type: textType },
          { name: 'stack', type: textType, isNullable: true },
          { name: 'context', type: jsonType, isNullable: true },
          { name: 'path', type: 'varchar', length: '500', isNullable: true },
          { name: 'method', type: 'varchar', length: '10', isNullable: true },
          {
            name: 'created_at',
            type: tsType,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'support_tickets',
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
            name: 'user_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isNullable: true,
          },
          { name: 'subject', type: 'varchar', length: '500' },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: strDef('open'),
          },
          {
            name: 'priority',
            type: 'varchar',
            length: '20',
            default: strDef('normal'),
          },
          {
            name: 'created_at',
            type: tsType,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: tsType,
            default: 'CURRENT_TIMESTAMP',
            ...(isMySQL ? { onUpdate: 'CURRENT_TIMESTAMP' } : {}),
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'support_tickets',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'ticket_messages',
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
            name: 'ticket_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          {
            name: 'admin_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isNullable: true,
          },
          { name: 'body', type: textType },
          { name: 'is_from_admin', type: 'boolean', default: false },
          {
            name: 'created_at',
            type: tsType,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'ticket_messages',
      new TableForeignKey({
        columnNames: ['ticket_id'],
        referencedTableName: 'support_tickets',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'ticket_messages',
      new TableForeignKey({
        columnNames: ['admin_id'],
        referencedTableName: 'admin_users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'app_versions',
        columns: [
          {
            name: 'id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isPrimary: true,
            generationStrategy: isMySQL ? undefined : 'uuid',
            default: isMySQL ? undefined : 'uuid_generate_v4()',
          },
          { name: 'platform', type: 'varchar', length: '20', isUnique: true },
          { name: 'version', type: 'varchar', length: '50' },
          { name: 'build_number', type: 'int', isNullable: true },
          { name: 'mandatory', type: 'boolean', default: false },
          { name: 'release_notes', type: textType, isNullable: true },
          {
            name: 'updated_at',
            type: tsType,
            default: 'CURRENT_TIMESTAMP',
            ...(isMySQL ? { onUpdate: 'CURRENT_TIMESTAMP' } : {}),
          },
        ],
      }),
      true,
    );

    const driversTable = await queryRunner.getTable('drivers');
    if (!driversTable?.findColumnByName('fraud_flagged_at')) {
      await queryRunner.addColumn(
        'drivers',
        new TableColumn({
          name: 'fraud_flagged_at',
          type: tsType,
          isNullable: true,
        }),
      );
    }
    if (!driversTable?.findColumnByName('fraud_flag_reason')) {
      await queryRunner.addColumn(
        'drivers',
        new TableColumn({
          name: 'fraud_flag_reason',
          type: textType,
          isNullable: true,
        }),
      );
    }

    const usersTable = await queryRunner.getTable('users');
    if (!usersTable?.findColumnByName('fraud_flagged_at')) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'fraud_flagged_at',
          type: tsType,
          isNullable: true,
        }),
      );
    }
    if (!usersTable?.findColumnByName('fraud_flag_reason')) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'fraud_flag_reason',
          type: textType,
          isNullable: true,
        }),
      );
    }

    if (isMySQL) {
      await queryRunner.query(
        `INSERT INTO system_settings (id, \`key\`, \`value\`, updated_at)
         SELECT UUID(), 'MAINTENANCE_MODE', 'false', NOW() FROM DUAL
         WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE \`key\` = 'MAINTENANCE_MODE')`,
      );
    } else {
      await queryRunner.query(`
        INSERT INTO system_settings (key, value)
        SELECT 'MAINTENANCE_MODE', 'false'
        WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE key = 'MAINTENANCE_MODE')
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isMySQL =
      queryRunner.connection.options.type === 'mysql' ||
      queryRunner.connection.options.type === 'mariadb';

    if (isMySQL) {
      await queryRunner.query(
        `DELETE FROM system_settings WHERE \`key\` = 'MAINTENANCE_MODE'`,
      );
    } else {
      await queryRunner.query(
        `DELETE FROM system_settings WHERE key = 'MAINTENANCE_MODE'`,
      );
    }

    await queryRunner.dropColumn('users', 'fraud_flag_reason');
    await queryRunner.dropColumn('users', 'fraud_flagged_at');
    await queryRunner.dropColumn('drivers', 'fraud_flag_reason');
    await queryRunner.dropColumn('drivers', 'fraud_flagged_at');

    await queryRunner.dropTable('app_versions', true);
    await queryRunner.dropTable('ticket_messages', true);
    await queryRunner.dropTable('support_tickets', true);
    await queryRunner.dropTable('error_logs', true);
    await queryRunner.dropTable('system_settings', true);
    await queryRunner.dropTable('notification_logs', true);
    await queryRunner.dropTable('notifications', true);
  }
}
