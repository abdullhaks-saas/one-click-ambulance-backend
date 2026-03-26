import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Phase 5 — Payments & Finance: payment_transactions, driver_wallet,
 * wallet_transactions, payouts, payout_transactions.
 */
export class CreatePhase5PaymentPayoutTables20250323120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isMySQL =
      queryRunner.connection.options.type === 'mysql' ||
      queryRunner.connection.options.type === 'mariadb';

    const jsonType = isMySQL ? 'json' : 'jsonb';

    // ─── payment_transactions ─────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'payment_transactions',
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
            name: 'payment_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          {
            name: 'kind',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'razorpay_payment_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'remote_status',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'payload',
            type: jsonType,
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
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
      'payment_transactions',
      new TableForeignKey({
        columnNames: ['payment_id'],
        referencedTableName: 'payments',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'payment_transactions',
      new TableIndex({
        name: 'IDX_payment_transactions_payment_id',
        columnNames: ['payment_id'],
      }),
    );

    // ─── driver_wallet ─────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'driver_wallet',
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
            isUnique: true,
          },
          {
            name: 'balance',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: '0',
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
            default: "'INR'",
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
      'driver_wallet',
      new TableForeignKey({
        columnNames: ['driver_id'],
        referencedTableName: 'drivers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // ─── wallet_transactions ───────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'wallet_transactions',
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
            name: 'transaction_type',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'booking_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isNullable: true,
          },
          {
            name: 'payment_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isNullable: true,
          },
          {
            name: 'payout_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isNullable: true,
          },
          {
            name: 'reference',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'balance_after',
            type: 'decimal',
            precision: 12,
            scale: 2,
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
      'wallet_transactions',
      new TableForeignKey({
        columnNames: ['driver_id'],
        referencedTableName: 'drivers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'wallet_transactions',
      new TableForeignKey({
        columnNames: ['booking_id'],
        referencedTableName: 'bookings',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'wallet_transactions',
      new TableForeignKey({
        columnNames: ['payment_id'],
        referencedTableName: 'payments',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndex(
      'wallet_transactions',
      new TableIndex({
        name: 'IDX_wallet_transactions_driver_id',
        columnNames: ['driver_id'],
      }),
    );

    await queryRunner.createIndex(
      'wallet_transactions',
      new TableIndex({
        name: 'IDX_wallet_transactions_created_at',
        columnNames: ['created_at'],
      }),
    );

    // ─── payouts ───────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'payouts',
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
            name: 'driver_bank_account_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isNullable: true,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
            default: "'INR'",
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
          },
          {
            name: 'period_start',
            type: isMySQL ? 'date' : 'date',
            isNullable: true,
          },
          {
            name: 'period_end',
            type: isMySQL ? 'date' : 'date',
            isNullable: true,
          },
          {
            name: 'failure_reason',
            type: 'text',
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
      'payouts',
      new TableForeignKey({
        columnNames: ['driver_id'],
        referencedTableName: 'drivers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'payouts',
      new TableForeignKey({
        columnNames: ['driver_bank_account_id'],
        referencedTableName: 'driver_bank_accounts',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndex(
      'payouts',
      new TableIndex({
        name: 'IDX_payouts_driver_id',
        columnNames: ['driver_id'],
      }),
    );

    await queryRunner.createIndex(
      'payouts',
      new TableIndex({
        name: 'IDX_payouts_status',
        columnNames: ['status'],
      }),
    );

    // FK wallet_transactions.payout_id → payouts (after payouts exists)
    await queryRunner.createForeignKey(
      'wallet_transactions',
      new TableForeignKey({
        columnNames: ['payout_id'],
        referencedTableName: 'payouts',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createIndex(
      'wallet_transactions',
      new TableIndex({
        name: 'IDX_wallet_transactions_payout_id',
        columnNames: ['payout_id'],
      }),
    );

    // ─── payout_transactions ─────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'payout_transactions',
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
            name: 'payout_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          {
            name: 'step',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'external_reference',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'response',
            type: jsonType,
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
      'payout_transactions',
      new TableForeignKey({
        columnNames: ['payout_id'],
        referencedTableName: 'payouts',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'payout_transactions',
      new TableIndex({
        name: 'IDX_payout_transactions_payout_id',
        columnNames: ['payout_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('payout_transactions', true);
    const wt = await queryRunner.getTable('wallet_transactions');
    const fkPayout = wt?.foreignKeys.find((fk) =>
      fk.columnNames.includes('payout_id'),
    );
    if (fkPayout) {
      await queryRunner.dropForeignKey('wallet_transactions', fkPayout);
    }
    await queryRunner.dropTable('payouts', true);
    await queryRunner.dropTable('wallet_transactions', true);
    await queryRunner.dropTable('driver_wallet', true);
    await queryRunner.dropTable('payment_transactions', true);
  }
}
