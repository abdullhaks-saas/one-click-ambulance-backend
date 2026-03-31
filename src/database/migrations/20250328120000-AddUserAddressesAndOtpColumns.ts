import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

/** Creates user_addresses. OTP is not stored on users (Redis-only). */
export class AddUserAddresses20250328120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isMySQL =
      queryRunner.connection.options.type === 'mysql' ||
      queryRunner.connection.options.type === 'mariadb';

    const hasUA = await queryRunner.getTable('user_addresses');
    if (!hasUA) {
      await queryRunner.createTable(
        new Table({
          name: 'user_addresses',
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
              name: 'address_line',
              type: 'varchar',
              length: '500',
            },
            {
              name: 'latitude',
              type: 'decimal',
              precision: 10,
              scale: 7,
            },
            {
              name: 'longitude',
              type: 'decimal',
              precision: 10,
              scale: 7,
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
        'user_addresses',
        new TableForeignKey({
          columnNames: ['user_id'],
          referencedTableName: 'users',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const ua = await queryRunner.getTable('user_addresses');
    if (ua) {
      const fk = ua.foreignKeys.find((f) =>
        f.columnNames.includes('user_id'),
      );
      if (fk) await queryRunner.dropForeignKey('user_addresses', fk);
      await queryRunner.dropTable('user_addresses');
    }
  }
}
