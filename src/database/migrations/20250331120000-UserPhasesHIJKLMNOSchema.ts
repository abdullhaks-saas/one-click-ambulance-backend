import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

/**
 * Phases H–P (user backend): notification read receipts, one rating per booking,
 * chats + call_logs per projectplan §10.
 */
export class UserPhasesHIJKLMNOSchema20250331120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isMySQL =
      queryRunner.connection.options.type === 'mysql' ||
      queryRunner.connection.options.type === 'mariadb';

    const textType = isMySQL ? 'longtext' : 'text';
    const tsType = isMySQL ? 'datetime' : 'timestamp';

    const chatsIdColumn = isMySQL
      ? {
          name: 'id',
          type: 'char',
          length: '36',
          isPrimary: true,
        }
      : {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          generationStrategy: 'uuid' as const,
          default: 'uuid_generate_v4()',
        };

    const callLogsIdColumn = isMySQL
      ? {
          name: 'id',
          type: 'char',
          length: '36',
          isPrimary: true,
        }
      : {
          name: 'id',
          type: 'uuid',
          isPrimary: true,
          generationStrategy: 'uuid' as const,
          default: 'uuid_generate_v4()',
        };

    const nlTable = await queryRunner.getTable('notification_logs');
    if (!nlTable?.findColumnByName('read_at')) {
      await queryRunner.addColumn(
        'notification_logs',
        new TableColumn({
          name: 'read_at',
          type: tsType,
          isNullable: true,
        }),
      );
    }

    // MySQL requires dropping the FK that uses the index before dropping the index itself
    const rideRatingsTable = await queryRunner.getTable('ride_ratings');
    const bookingFk = rideRatingsTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('booking_id') !== -1,
    );
    if (bookingFk) {
      await queryRunner.dropForeignKey('ride_ratings', bookingFk);
    }

    await queryRunner.dropIndex('ride_ratings', 'IDX_ride_ratings_booking_id');
    await queryRunner.createIndex(
      'ride_ratings',
      new TableIndex({
        name: 'UQ_ride_ratings_booking_id',
        columnNames: ['booking_id'],
        isUnique: true,
      }),
    );

    // Re-add the foreign key after unique index is in place
    if (bookingFk) {
      await queryRunner.createForeignKey(
        'ride_ratings',
        new TableForeignKey({
          columnNames: ['booking_id'],
          referencedTableName: 'bookings',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }

    await queryRunner.createTable(
      new Table({
        name: 'chats',
        columns: [
          chatsIdColumn,
          {
            name: 'booking_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          { name: 'sender_type', type: 'varchar', length: '20' },
          { name: 'message', type: textType },
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
      'chats',
      new TableForeignKey({
        columnNames: ['booking_id'],
        referencedTableName: 'bookings',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'chats',
      new TableIndex({
        name: 'IDX_chats_booking_id_created',
        columnNames: ['booking_id', 'created_at'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'call_logs',
        columns: [
          callLogsIdColumn,
          {
            name: 'booking_id',
            type: isMySQL ? 'char' : 'uuid',
            length: isMySQL ? '36' : undefined,
          },
          { name: 'caller', type: 'varchar', length: '50' },
          { name: 'receiver', type: 'varchar', length: '50' },
          { name: 'call_duration', type: 'int', isNullable: true },
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
      'call_logs',
      new TableForeignKey({
        columnNames: ['booking_id'],
        referencedTableName: 'bookings',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'call_logs',
      new TableIndex({
        name: 'IDX_call_logs_booking_id',
        columnNames: ['booking_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('call_logs', true);
    await queryRunner.dropTable('chats', true);
    const rideRatingsTable = await queryRunner.getTable('ride_ratings');
    const bookingFk = rideRatingsTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('booking_id') !== -1,
    );
    if (bookingFk) {
      await queryRunner.dropForeignKey('ride_ratings', bookingFk);
    }

    await queryRunner.dropIndex('ride_ratings', 'UQ_ride_ratings_booking_id');
    await queryRunner.createIndex(
      'ride_ratings',
      new TableIndex({
        name: 'IDX_ride_ratings_booking_id',
        columnNames: ['booking_id'],
      }),
    );

    if (bookingFk) {
      await queryRunner.createForeignKey(
        'ride_ratings',
        new TableForeignKey({
          columnNames: ['booking_id'],
          referencedTableName: 'bookings',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }
    await queryRunner.dropColumn('notification_logs', 'read_at');
  }
}
