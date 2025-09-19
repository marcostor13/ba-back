import { Injectable } from '@nestjs/common';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {

  private readonly s3Client: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.getOrThrow('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async uploadImageBuffer(
    file: Buffer,
    key: string
  ) {

    const bucketName = this.configService.getOrThrow('AWS_S3_BUCKET_NAME');

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: 'image/png'
    });

    try {
      await this.s3Client.send(command);
      return `https://s3.${this.configService.getOrThrow('AWS_REGION')}.amazonaws.com/${bucketName}/${key}`;
    } catch (error) {
      throw new Error(`Error al subir el archivo a S3: ${error.message}`);
    }
  }


  async uploadImage(
    file: Express.Multer.File,
    key: string
  ) {

    const bucketName = this.configService.getOrThrow('AWS_S3_BUCKET_NAME');

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    });

    try {
      await this.s3Client.send(command);
      return `https://s3.${this.configService.getOrThrow('AWS_REGION')}.amazonaws.com/${bucketName}/${key}`;
    } catch (error) {
      throw new Error(`Error al subir el archivo a S3: ${error.message}`);
    }
  }

  async deleteFile(key: string) {
    const bucketName = this.configService.getOrThrow('AWS_S3_BUCKET_NAME');

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      return { message: `Archivo ${key} eliminado exitosamente.` };
    } catch (error) {
      throw new Error(`Error al eliminar el archivo de S3: ${error.message}`);
    }
  }
}
