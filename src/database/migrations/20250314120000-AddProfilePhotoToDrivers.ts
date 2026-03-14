import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProfilePhotoToDrivers20250314120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'drivers',
      new TableColumn({
        name: 'profile_photo',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('drivers', 'profile_photo');
  }
}
