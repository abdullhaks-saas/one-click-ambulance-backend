import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const S3_SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.getOrThrow<string>('AWS_BUCKET_NAME');
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  /**
   * Returns a pre-signed URL for an S3 object with 1 hour expiry.
   * @param key - S3 object key (e.g. drivers/profile-images/xxx.jpeg)
   * @returns Signed URL string, or null if key is empty/invalid
   */
  async getSignedUrl(key: string | null | undefined): Promise<string | null> {
    if (!key || typeof key !== 'string' || key.trim() === '') {
      return null;
    }
    const trimmedKey = key.trim();
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: trimmedKey,
      });
      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: S3_SIGNED_URL_EXPIRY_SECONDS,
      });
      return signedUrl;
    } catch {
      return null;
    }
  }
}
