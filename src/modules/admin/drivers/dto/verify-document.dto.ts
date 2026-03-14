import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { VerificationStatus } from 'src/database/entities/driver-document.entity'; 

export class VerifyDocumentDto {
  @ApiProperty({ description: 'Driver document UUID' })
  @IsNotEmpty()
  @IsUUID()
  document_id: string;

  @ApiProperty({
    description: 'Verification action',
    enum: ['verified', 'rejected'] as const,
  })
  @IsNotEmpty()
  @IsEnum(VerificationStatus)
  status: VerificationStatus;
}
