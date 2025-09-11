import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatOpenAI } from '@langchain/openai';
import { loadSummarizationChain } from 'langchain/chains';
import { Document } from 'langchain/document';

@Injectable()
export class AudioService {
    private readonly logger = new Logger(AudioService.name);
    private readonly openai: OpenAI;
    private readonly chatModel: ChatOpenAI;

    constructor(private readonly configService: ConfigService) {
        // Inicializar cliente de OpenAI para transcripción
        this.openai = new OpenAI({
            apiKey: this.configService.get<string>('OPENAI_API_KEY'),
        });

        // Inicializar modelo de chat para resumen
        this.chatModel = new ChatOpenAI({
            openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
            modelName: 'gpt-3.5-turbo',
            temperature: 0.3, // Temperatura baja para resúmenes más consistentes
        });
    }

    async summarizeAudio(file: Express.Multer.File): Promise<{ summary: string }> {
        try {
            this.logger.log(`Iniciando procesamiento del archivo: ${file.originalname}`);

            // Paso 1: Transcripción con OpenAI Whisper
            const transcription = await this.transcribeAudio(file);
            this.logger.log(`Transcripción completada. Longitud del texto: ${transcription.length} caracteres`);

            // Paso 2: Generar resumen con LangChain
            const summary = await this.generateSummary(transcription);
            this.logger.log('Resumen generado exitosamente');

            return { summary };
        } catch (error) {
            this.logger.error(`Error en summarizeAudio: ${error.message}`, error.stack);
            throw error;
        }
    }

    private async transcribeAudio(file: Express.Multer.File): Promise<string> {
        try {
            // Crear un objeto File compatible con la API de OpenAI
            const audioFile = new File([file.buffer], file.originalname, {
                type: file.mimetype,
            });

            const transcription = await this.openai.audio.transcriptions.create({
                file: audioFile,
                model: 'whisper-1',
                language: 'es', // Especificar español para mejor precisión
                response_format: 'text',
            });

            return transcription as string;
        } catch (error) {
            this.logger.error(`Error en transcripción: ${error.message}`);
            throw new Error(`Error al transcribir el audio: ${error.message}`);
        }
    }

    private async generateSummary(text: string): Promise<string> {
        try {
            // Determinar el tipo de cadena basado en la longitud del texto
            const textLength = text.length;
            const chainType = textLength > 4000 ? 'map_reduce' : 'stuff';

            this.logger.log(`Generando resumen con cadena tipo: ${chainType}`);

            // Crear documento de LangChain
            const document = new Document({
                pageContent: text,
                metadata: { source: 'audio_transcription' },
            });

            // Cargar cadena de resumen
            const summarizationChain = loadSummarizationChain(this.chatModel, {
                type: chainType,
            });

            // Ejecutar la cadena de resumen
            const result = await summarizationChain.call({
                input_documents: [document],
            });

            return result.text || 'No se pudo generar un resumen del contenido.';
        } catch (error) {
            this.logger.error(`Error en generación de resumen: ${error.message}`);
            throw new Error(`Error al generar el resumen: ${error.message}`);
        }
    }
}
