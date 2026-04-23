import { Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {

  private readonly s3Client: S3Client;

  constructor(private readonly configService: ConfigService) {
    const region = this.getRegion();
    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: this.getSanitizedEnv('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.getSanitizedEnv('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  private getSanitizedEnv(key: string): string {
    const raw = this.configService.getOrThrow<string>(key);
    return raw.trim().replace(/^['"]|['"]$/g, '');
  }

  private getRegion(): string {
    return this.getSanitizedEnv('AWS_REGION');
  }

  private isValidBucketName(name: string): boolean {
    if (!name) return false;
    if (name.length < 3 || name.length > 63) return false;
    if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(name)) return false;
    if (/\.\./.test(name)) return false;
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(name)) return false; // Evitar formato IP
    return true;
  }

  private getBucketName(): string {
    const bucket = this.getSanitizedEnv('AWS_S3_BUCKET_NAME');
    if (!this.isValidBucketName(bucket)) {
      throw new Error('AWS_S3_BUCKET_NAME inválido. Verifica que no tenga comillas, espacios o caracteres no permitidos.');
    }
    return bucket;
  }

  private encodeS3Key(key: string): string {
    return encodeURIComponent(key).replace(/%2F/g, '/');
  }

  private buildPublicUrl(bucket: string, key: string): string {
    const region = this.getRegion();
    const encodedKey = this.encodeS3Key(key);
    if (region === 'us-east-1') {
      return `https://${bucket}.s3.amazonaws.com/${encodedKey}`;
    }
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
  }

  async uploadFileBuffer(
    file: Buffer,
    key: string,
    contentType: string = 'application/octet-stream'
  ) {

    const bucketName = this.getBucketName();

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: contentType
    });

    try {
      await this.s3Client.send(command);
      return this.buildPublicUrl(bucketName, key);
    } catch (error) {
      throw new Error(`Error al subir el archivo a S3: ${error.message}`);
    }
  }

  async uploadImageBuffer(
    file: Buffer,
    key: string
  ) {
    return this.uploadFileBuffer(file, key, 'image/png');
  }


  async uploadImage(
    file: Express.Multer.File,
    key: string
  ) {

    const bucketName = this.getBucketName();

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    });

    try {
      await this.s3Client.send(command);
      return this.buildPublicUrl(bucketName, key);
    } catch (error) {
      throw new Error(`Error al subir el archivo a S3: ${error.message}`);
    }
  }

  async deleteFile(key: string) {
    const bucketName = this.getBucketName();

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

  /**
   * Genera una URL presignada para subir un archivo directamente a S3
   * @param fileName Nombre del archivo (puede incluir ruta)
   * @param contentType Tipo MIME del archivo (opcional)
   * @param expiresIn Tiempo de expiración en segundos (default: 3600 = 1 hora)
   * @returns URL presignada y la URL pública final del archivo
   */
  async generatePresignedUrl(
    fileName: string,
    contentType?: string,
    expiresIn: number = 3600,
  ): Promise<{ presignedUrl: string; publicUrl: string; key: string }> {
    const bucketName = this.getBucketName();
    
    // Generar un nombre único para el archivo
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${timestamp}-${sanitizedFileName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
    });

    try {
      const presignedUrl = await getSignedUrl(this.s3Client as any, command as any, {
        expiresIn,
      });

      const publicUrl = this.buildPublicUrl(bucketName, key);

      return {
        presignedUrl,
        publicUrl,
        key,
      };
    } catch (error) {
      throw new Error(`Error al generar la URL presignada: ${error.message}`);
    }
  }

  /**
   * Parsea una URL de S3 y extrae bucket y key.
   */
  parseS3Url(url: string): { bucket: string; key: string } | null {
    try {
      const urlObj = new URL(url);
      let bucket: string;
      let key: string;

      if (urlObj.hostname.includes('.s3.') || urlObj.hostname.includes('s3.amazonaws.com')) {
        if (urlObj.hostname.startsWith('s3.')) {
          const pathParts = urlObj.pathname.split('/').filter((p) => p);
          bucket = pathParts[0];
          key = decodeURIComponent(pathParts.slice(1).join('/'));
        } else {
          bucket = urlObj.hostname.split('.')[0];
          key = decodeURIComponent(urlObj.pathname.replace(/^\//, ''));
        }
        return { bucket, key };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Genera una URL presignada para descargar/visualizar un archivo en S3.
   * Soluciona "Access Denied" cuando el bucket no tiene acceso público.
   * @param s3Url URL pública del archivo en S3
   * @param expiresIn Segundos de validez (default: 7 días)
   */
  async getPresignedDownloadUrl(
    s3Url: string,
    expiresIn: number = 7 * 24 * 60 * 60,
  ): Promise<string> {
    const parsed = this.parseS3Url(s3Url);
    if (!parsed) {
      return s3Url; // Si no es URL de S3, devolver original
    }

    const command = new GetObjectCommand({
      Bucket: parsed.bucket,
      Key: parsed.key,
    });

    try {
      return await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });
    } catch (error) {
      throw new Error(`Error al generar URL presignada de descarga: ${error}`);
    }
  }

  /**
   * Descarga un archivo desde S3 y devuelve el buffer.
   * @param s3Url URL del archivo en S3
   */
  async getFileBuffer(s3Url: string): Promise<{ buffer: Buffer; contentType: string }> {
    const parsed = this.parseS3Url(s3Url);
    if (!parsed) {
      throw new Error(`URL de S3 no válida: ${s3Url}`);
    }

    const command = new GetObjectCommand({
      Bucket: parsed.bucket,
      Key: parsed.key,
    });

    const response = await this.s3Client.send(command);
    if (!response.Body) {
      throw new Error('No se pudo obtener el cuerpo del archivo desde S3');
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const contentType = response.ContentType || 'application/octet-stream';

    return { buffer, contentType };
  }
}
