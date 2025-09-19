import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
  Delete,
  Param,
  FileTypeValidator
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) { }

  @Post()
  @UseInterceptors(FileInterceptor('file')) // 'file' debe coincidir con el nombre del campo en el FormData del frontend
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB max
          new FileTypeValidator({ fileType: /.(jpg|jpeg|png|gif)$/ }), // Valida tipos de archivo
          // new FileTypeValidator({ fileType: /.(jpg|jpeg|png|gif|pdf|doc|docx|txt|xls|xlsx|ppt|pptx|mp4|mov|avi|mkv|webm)$/ }), // Valida tipos de archivo
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



}
