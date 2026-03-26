import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddTollRatingsAlerts20250326120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isMySQL =
      queryRunner.connection.options.type === 'mysql' ||
      queryRunner.connection.options.type === 'mariadb';

    const strDef = (value: string) => `'${value.replace(/'/g, "''")}'`;
    const jsonType = isMySQL ? 'json' : 'jsonb';
    const tsType = isMySQL ? 'datetime' : 'timestamp';
    const textType = isMySQL ? 'longtext' : 'text';

    // 1. Add toll_charge column to pricing_rules
    const pricingTable = await queryRunner.getTable('pricing_rules');
    if (!pricingTable?.findColumnByName('toll_charge')) {
      await queryRunner.addColumn(
        'pricing_rules',
        new TableColumn({
          name: 'toll_charge',
          type: 'decimal',
          precision: 10,
          scale: 2,
          default: 0,
        }),
      );
    }

    // 2. Create toll_charges table (per-booking toll line items)
    await queryRunner.createTable(
      new Table({
        name: 'toll_charges',
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
            name: 'booking_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
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
      'toll_charges',
      new TableForeignKey({
        columnNames: ['booking_id'],
        referencedTableName: 'bookings',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 3. Create ride_ratings table
    await queryRunner.createTable(
      new Table({
        name: 'ride_ratings',
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
            name: 'booking_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          {
            name: 'user_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          {
            name: 'driver_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          { name: 'rating', type: 'int' },
          { name: 'review', type: textType, isNullable: true },
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
      'ride_ratings',
      new TableForeignKey({
        columnNames: ['booking_id'],
        referencedTableName: 'bookings',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'ride_ratings',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'ride_ratings',
      new TableForeignKey({
        columnNames: ['driver_id'],
        referencedTableName: 'drivers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'ride_ratings',
      new TableIndex({
        name: 'IDX_ride_ratings_driver_id',
        columnNames: ['driver_id'],
      }),
    );

    await queryRunner.createIndex(
      'ride_ratings',
      new TableIndex({
        name: 'IDX_ride_ratings_booking_id',
        columnNames: ['booking_id'],
      }),
    );

    await queryRunner.createIndex(
      'ride_ratings',
      new TableIndex({
        name: 'IDX_ride_ratings_rating',
        columnNames: ['rating'],
      }),
    );

    // 4. Create admin_alerts table
    await queryRunner.createTable(
      new Table({
        name: 'admin_alerts',
        columns: [
          {
            name: 'id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isPrimary: true,
            generationStrategy: isMySQL ? undefined : 'uuid',
            default: isMySQL ? undefined : 'uuid_generate_v4()',
          },
          { name: 'type', type: 'varchar', length: '50' },
          {
            name: 'severity',
            type: 'varchar',
            length: '20',
            default: strDef('info'),
          },
          { name: 'title', type: 'varchar', length: '255' },
          { name: 'message', type: textType },
          { name: 'metadata', type: jsonType, isNullable: true },
          { name: 'is_read', type: 'boolean', default: false },
          { name: 'is_dismissed', type: 'boolean', default: false },
          {
            name: 'created_at',
            type: tsType,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'admin_alerts',
      new TableIndex({
        name: 'IDX_admin_alerts_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'admin_alerts',
      new TableIndex({
        name: 'IDX_admin_alerts_is_read',
        columnNames: ['is_read'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('admin_alerts', true);
    await queryRunner.dropTable('ride_ratings', true);
    await queryRunner.dropTable('toll_charges', true);

    const pricingTable = await queryRunner.getTable('pricing_rules');
    if (pricingTable?.findColumnByName('toll_charge')) {
      await queryRunner.dropColumn('pricing_rules', 'toll_charge');
    }
  }
}
