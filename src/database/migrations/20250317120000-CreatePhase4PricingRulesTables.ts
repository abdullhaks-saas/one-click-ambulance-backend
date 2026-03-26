import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Creates pricing_rules table for Phase 4: Pricing Configuration.
 * Aligns with One Click Ambulance plan (plan.md) Phase 4.1.
 */
export class CreatePhase4PricingRulesTables20250317120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isMySQL =
      queryRunner.connection.options.type === 'mysql' ||
      queryRunner.connection.options.type === 'mariadb';

    await queryRunner.createTable(
      new Table({
        name: 'pricing_rules',
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
            name: 'ambulance_type_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          {
            name: 'base_fare',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'per_km_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'emergency_charge',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'night_charge',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'minimum_fare',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
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
      'pricing_rules',
      new TableForeignKey({
        columnNames: ['ambulance_type_id'],
        referencedTableName: 'ambulance_types',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'pricing_rules',
      new TableIndex({
        name: 'IDX_pricing_rules_ambulance_type_id',
        columnNames: ['ambulance_type_id'],
      }),
    );

    await queryRunner.createIndex(
      'pricing_rules',
      new TableIndex({
        name: 'UQ_pricing_rules_ambulance_type_id',
        columnNames: ['ambulance_type_id'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('pricing_rules', true);
  }
}
