import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Creates all tables required for Phase 3: Booking & Ride Management.
 * Aligns with One Click Ambulance plan (plan.md) Phase 3.1 and 3.2.
 *
 * Tables: zones, zone_coordinates, driver_status, driver_locations, driver_zones,
 *         bookings, booking_status_history, booking_driver_assignments,
 *         ride_details, ride_status, ride_tracking, payments
 */
export class CreatePhase3BookingRideTables20250316120000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isMySQL =
      queryRunner.connection.options.type === 'mysql' ||
      queryRunner.connection.options.type === 'mariadb';

    // ─── 1. zones ─────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'zones',
        columns: [
          {
            name: 'id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isPrimary: true,
            generationStrategy: isMySQL ? undefined : 'uuid',
            default: isMySQL ? undefined : 'uuid_generate_v4()',
          },
          { name: 'zone_name', type: 'varchar', length: '255' },
          { name: 'city', type: 'varchar', length: '255', isNullable: true },
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

    // ─── 2. zone_coordinates ──────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'zone_coordinates',
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
            name: 'zone_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          { name: 'latitude', type: 'decimal', precision: 10, scale: 7 },
          { name: 'longitude', type: 'decimal', precision: 10, scale: 7 },
          { name: 'sequence_order', type: 'int', default: 0 },
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
      'zone_coordinates',
      new TableForeignKey({
        columnNames: ['zone_id'],
        referencedTableName: 'zones',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // ─── 3. driver_status ──────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'driver_status',
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
            name: 'is_online',
            type: 'boolean',
            default: false,
          },
          {
            name: 'last_seen',
            type: isMySQL ? 'datetime' : 'timestamp',
            isNullable: true,
          },
          {
            name: 'current_booking_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
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
      'driver_status',
      new TableForeignKey({
        columnNames: ['driver_id'],
        referencedTableName: 'drivers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'driver_status',
      new TableIndex({
        name: 'IDX_driver_status_driver_id',
        columnNames: ['driver_id'],
      }),
    );

    // ─── 4. driver_locations ───────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'driver_locations',
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
          { name: 'latitude', type: 'decimal', precision: 10, scale: 7 },
          { name: 'longitude', type: 'decimal', precision: 10, scale: 7 },
          {
            name: 'heading',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
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
      'driver_locations',
      new TableForeignKey({
        columnNames: ['driver_id'],
        referencedTableName: 'drivers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'driver_locations',
      new TableIndex({
        name: 'IDX_driver_locations_driver_id',
        columnNames: ['driver_id'],
      }),
    );

    // ─── 5. driver_zones ───────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'driver_zones',
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
            name: 'zone_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
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
      'driver_zones',
      new TableForeignKey({
        columnNames: ['driver_id'],
        referencedTableName: 'drivers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'driver_zones',
      new TableForeignKey({
        columnNames: ['zone_id'],
        referencedTableName: 'zones',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'driver_zones',
      new TableIndex({
        name: 'IDX_driver_zones_driver_zone',
        columnNames: ['driver_id', 'zone_id'],
      }),
    );

    // ─── 6. bookings ───────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'bookings',
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
          },
          {
            name: 'ambulance_type_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          {
            name: 'zone_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
            isNullable: true,
          },
          {
            name: 'pickup_latitude',
            type: 'decimal',
            precision: 10,
            scale: 7,
          },
          {
            name: 'pickup_longitude',
            type: 'decimal',
            precision: 10,
            scale: 7,
          },
          {
            name: 'pickup_address',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'drop_latitude',
            type: 'decimal',
            precision: 10,
            scale: 7,
          },
          {
            name: 'drop_longitude',
            type: 'decimal',
            precision: 10,
            scale: 7,
          },
          {
            name: 'drop_address',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'created'",
          },
          {
            name: 'estimated_fare',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'final_fare',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'estimated_distance_km',
            type: 'decimal',
            precision: 8,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'estimated_duration_min',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'is_emergency',
            type: 'boolean',
            default: false,
          },
          {
            name: 'cancellation_reason',
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
      'bookings',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'bookings',
      new TableForeignKey({
        columnNames: ['ambulance_type_id'],
        referencedTableName: 'ambulance_types',
        referencedColumnNames: ['id'],
      }),
    );

    await queryRunner.createForeignKey(
      'bookings',
      new TableForeignKey({
        columnNames: ['zone_id'],
        referencedTableName: 'zones',
        referencedColumnNames: ['id'],
      }),
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'IDX_bookings_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'IDX_bookings_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'IDX_bookings_zone_id',
        columnNames: ['zone_id'],
      }),
    );

    await queryRunner.createIndex(
      'bookings',
      new TableIndex({
        name: 'IDX_bookings_created_at',
        columnNames: ['created_at'],
      }),
    );

    // ─── 7. booking_status_history ──────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'booking_status_history',
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
          { name: 'status', type: 'varchar', length: '50' },
          {
            name: 'metadata',
            type: isMySQL ? 'json' : 'jsonb',
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
      'booking_status_history',
      new TableForeignKey({
        columnNames: ['booking_id'],
        referencedTableName: 'bookings',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'booking_status_history',
      new TableIndex({
        name: 'IDX_booking_status_history_booking_id',
        columnNames: ['booking_id'],
      }),
    );

    // ─── 8. booking_driver_assignments ─────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'booking_driver_assignments',
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
            name: 'driver_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          {
            name: 'assigned_at',
            type: isMySQL ? 'datetime' : 'timestamp',
            default: isMySQL ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
          },
          {
            name: 'accepted_at',
            type: isMySQL ? 'datetime' : 'timestamp',
            isNullable: true,
          },
          {
            name: 'rejected_at',
            type: isMySQL ? 'datetime' : 'timestamp',
            isNullable: true,
          },
          {
            name: 'rejection_reason',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'is_current',
            type: 'boolean',
            default: true,
          },
          {
            name: 'timeout_at',
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

    await queryRunner.createForeignKey(
      'booking_driver_assignments',
      new TableForeignKey({
        columnNames: ['booking_id'],
        referencedTableName: 'bookings',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'booking_driver_assignments',
      new TableForeignKey({
        columnNames: ['driver_id'],
        referencedTableName: 'drivers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'booking_driver_assignments',
      new TableIndex({
        name: 'IDX_booking_driver_assignments_booking_id',
        columnNames: ['booking_id'],
      }),
    );

    // ─── 9. ride_details ───────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'ride_details',
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
            isUnique: true,
          },
          {
            name: 'total_distance_km',
            type: 'decimal',
            precision: 8,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'total_duration_min',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'trip_started_at',
            type: isMySQL ? 'datetime' : 'timestamp',
            isNullable: true,
          },
          {
            name: 'trip_completed_at',
            type: isMySQL ? 'datetime' : 'timestamp',
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
      'ride_details',
      new TableForeignKey({
        columnNames: ['booking_id'],
        referencedTableName: 'bookings',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // ─── 10. ride_status ──────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'ride_status',
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
            isUnique: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'accepted'",
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
      'ride_status',
      new TableForeignKey({
        columnNames: ['booking_id'],
        referencedTableName: 'bookings',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'ride_status',
      new TableIndex({
        name: 'IDX_ride_status_booking_id',
        columnNames: ['booking_id'],
      }),
    );

    // ─── 11. ride_tracking ──────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'ride_tracking',
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
          { name: 'latitude', type: 'decimal', precision: 10, scale: 7 },
          { name: 'longitude', type: 'decimal', precision: 10, scale: 7 },
          {
            name: 'recorded_at',
            type: isMySQL ? 'datetime' : 'timestamp',
            default: isMySQL ? 'CURRENT_TIMESTAMP' : 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'ride_tracking',
      new TableForeignKey({
        columnNames: ['booking_id'],
        referencedTableName: 'bookings',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'ride_tracking',
      new TableIndex({
        name: 'IDX_ride_tracking_booking_id',
        columnNames: ['booking_id'],
      }),
    );

    // ─── 12. payments ──────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'payments',
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
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'razorpay_order_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'razorpay_payment_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'payment_method',
            type: 'varchar',
            length: '50',
            default: "'online'",
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
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
      'payments',
      new TableForeignKey({
        columnNames: ['booking_id'],
        referencedTableName: 'bookings',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_booking_id',
        columnNames: ['booking_id'],
      }),
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('payments', true);
    await queryRunner.dropTable('ride_tracking', true);
    await queryRunner.dropTable('ride_status', true);
    await queryRunner.dropTable('ride_details', true);
    await queryRunner.dropTable('booking_driver_assignments', true);
    await queryRunner.dropTable('booking_status_history', true);
    await queryRunner.dropTable('bookings', true);
    await queryRunner.dropTable('driver_zones', true);
    await queryRunner.dropTable('driver_locations', true);
    await queryRunner.dropTable('driver_status', true);
    await queryRunner.dropTable('zone_coordinates', true);
    await queryRunner.dropTable('zones', true);
  }
}
