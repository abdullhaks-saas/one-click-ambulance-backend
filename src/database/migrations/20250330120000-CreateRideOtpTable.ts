import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateRideOtpTable20250330120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isMySQL =
      queryRunner.connection.options.type === 'mysql' ||
      queryRunner.connection.options.type === 'mariadb';

    const hasTable = await queryRunner.getTable('ride_otp');
    if (!hasTable) {
      await queryRunner.createTable(
        new Table({
          name: 'ride_otp',
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
              name: 'otp_code',
              type: 'varchar',
              length: '6',
            },
            {
              name: 'verified',
              type: 'boolean',
              default: false,
            },
            {
              name: 'created_at',
              type: isMySQL ? 'datetime' : 'timestamp',
              default: isMySQL ? 'CURRENT_TIMESTAMP' : 'now()',
            },
          ],
        }),
      );

      await queryRunner.createForeignKey(
        'ride_otp',
        new TableForeignKey({
          columnNames: ['booking_id'],
          referencedTableName: 'bookings',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('ride_otp');
    if (table) {
      const fk = table.foreignKeys.find((f) =>
        f.columnNames.includes('booking_id'),
      );
      if (fk) await queryRunner.dropForeignKey('ride_otp', fk);
      await queryRunner.dropTable('ride_otp');
    }
  }
}
