import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    HttpStatus,
    HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AudioService } from './audio.service';

@Controller('audio')
export class AudioController {
    constructor(private readonly audioService: AudioService) { }

    @Post('summarize')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('audio'))
    async summarizeAudio(@UploadedFile() file: Express.Multer.File) {
        // Validar que el archivo existe
        if (!file) {
            throw new BadRequestException('No se ha proporcionado ningún archivo de audio');
        }

        // Validar que es un archivo de audio
        const allowedMimeTypes = [
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/m4a',
            'audio/ogg',
            'audio/webm',
            'audio/mp4',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                'El archivo debe ser un formato de audio válido (mp3, wav, m4a, ogg, webm, mp4)'
            );
        }

        // Validar tamaño del archivo (máximo 25MB para OpenAI Whisper)
        const maxSizeInBytes = 25 * 1024 * 1024; // 25MB
        if (file.size > maxSizeInBytes) {
            throw new BadRequestException(
                'El archivo de audio no puede superar los 25MB'
            );
        }

        try {
            const result = await this.audioService.summarizeAudio(file);
            return {
                success: true,
                data: result,
                message: 'Audio procesado y resumido exitosamente',
            };
        } catch (error) {
            throw new BadRequestException(
                `Error al procesar el audio: ${error.message}`
            );
        }
    }
}
