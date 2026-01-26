import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    HttpStatus,
    HttpCode,
    Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AudioService } from './audio.service';
import * as path from 'path';
import { IsString, IsUrl } from 'class-validator';

class SummarizeAudioUrlDto {
    @IsString()
    @IsUrl()
    url: string;
}

@Controller('audio')
export class AudioController {
    constructor(private readonly audioService: AudioService) { }

    @Post('summarize')
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('audio'))
    async summarizeAudio(@UploadedFile() file: Express.Multer.File) {
        // Log de entrada
        console.log('[AudioController] POST /audio/summarize llamado');

        // Validar que el archivo existe
        if (!file) {
            console.error('[AudioController] No se ha proporcionado ningún archivo de audio');
            throw new BadRequestException('No se ha proporcionado ningún archivo de audio');
        }

        const extension = path.extname(file.originalname || '').toLowerCase();
        console.log(
            `[AudioController] Archivo recibido: name=${file.originalname}, mime=${file.mimetype}, ext=${extension}, size=${file.size} bytes`
        );

        // Validar que es un archivo de audio
        const allowedMimeTypes = [
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/m4a',
            'audio/x-m4a', // Formato común en iOS
            'audio/ogg',
            'audio/webm',
            'audio/mp4',
            'audio/aac', // Formato común en iOS
            'audio/x-aac',
            'audio/caf', // Core Audio Format (iOS)
            'audio/x-caf',
            'audio/flac',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            console.error(
                `[AudioController] MIME no válido: mime=${file.mimetype}, name=${file.originalname}, ext=${extension}`
            );
            throw new BadRequestException(
                'El archivo debe ser un formato de audio válido (mp3, wav, m4a, ogg, webm, mp4)'
            );
        }

        // Validar tamaño del archivo (máximo 25MB para OpenAI Whisper)
        const maxSizeInBytes = 25 * 1024 * 1024; // 25MB
        if (file.size > maxSizeInBytes) {
            console.error(
                `[AudioController] Archivo demasiado grande: size=${file.size} bytes, max=${maxSizeInBytes} bytes, name=${file.originalname}`
            );
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
            console.error('[AudioController] Error al procesar el audio:', error);
            throw new BadRequestException(
                `Error al procesar el audio: ${error?.message}`
            );
        }
    }

    @Post('summarize-from-url')
    @HttpCode(HttpStatus.OK)
    async summarizeAudioFromUrl(@Body() dto: SummarizeAudioUrlDto) {
        console.log('[AudioController] POST /audio/summarize-from-url llamado');
        console.log(`[AudioController] URL recibida: ${dto.url}`);

        if (!dto.url) {
            throw new BadRequestException('URL del archivo de audio es requerida');
        }

        // Validar que sea una URL válida
        try {
            new URL(dto.url);
        } catch {
            throw new BadRequestException('URL inválida');
        }

        try {
            const result = await this.audioService.summarizeAudioFromUrl(dto.url);
            return {
                success: true,
                data: result,
                message: 'Audio procesado y resumido exitosamente desde URL',
            };
        } catch (error) {
            console.error('[AudioController] Error al procesar el audio desde URL:', error);
            throw new BadRequestException(
                `Error al procesar el audio: ${error?.message}`
            );
        }
    }
}
