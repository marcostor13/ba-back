import {
  Controller,
  Post,
  Get,
  Query,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
  Delete,
  Param,
  FileTypeValidator,
  Body,
  ValidationPipe,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { UploadService } from './upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { GeneratePresignedUrlDto } from './dto/generate-presigned-url.dto';

const validationPipe = new ValidationPipe({ transform: true, whitelist: true });

@Controller('upload')
@UseGuards(AuthGuard('jwt'))
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } })) // 'file' debe coincidir con el nombre del campo en el FormData del frontend
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB max
          // Acepta imágenes, videos y audio por mimetype o extensión
          new FileTypeValidator({ fileType: /(^image\/.*$)|(^video\/.*$)|(^audio\/.*$)|(\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|mp4|mov|avi|mkv|webm|mpeg|mpg|m4v|3gp|3g2|flv|wmv|ts|m2ts|ogv|mp3|wav|aac|ogg|m4a|flac|wma|aiff|opus)$)/i }),
        ],
        exceptionFactory: (errors) => {
          throw new BadRequestException(errors)
        }
      })
    )
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    const fileName = `${Date.now()}-${file.originalname}`;
    const fileUrl = await this.uploadService.uploadImage(file, fileName);
    return { url: fileUrl };
  }

  @Delete(':key')
  async deleteFile(@Param('key') key: string) {
    return this.uploadService.deleteFile(key);
  }

  @Post('presigned-url')
  async generatePresignedUrl(
    @Body(validationPipe) dto: GeneratePresignedUrlDto,
  ): Promise<{ presignedUrl: string; publicUrl: string; key: string }> {
    return this.uploadService.generatePresignedUrl(
      dto.fileName,
      dto.contentType,
    );
  }

  /**
   * Proxy de imagen: descarga desde S3 y devuelve los bytes al browser.
   * Resuelve el problema de CORS cuando jsPDF intenta cargar imágenes S3.
   * GET /upload/image-proxy?url=https://bucket.s3...
   */
  @Get('image-proxy')
  async imageProxy(
    @Query('url') url: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!url) {
      res.status(400).json({ message: 'url query param is required' });
      return;
    }

    try {
      const { buffer, contentType } = await this.uploadService.getFileBuffer(url);
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'private, max-age=3600');
      res.set('Access-Control-Allow-Origin', '*');
      res.end(buffer);
    } catch {
      res.status(404).json({ message: 'File not found or could not be fetched' });
    }
  }
}
