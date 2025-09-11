import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AudioService } from './audio.service';

// Mock de OpenAI
jest.mock('openai', () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            audio: {
                transcriptions: {
                    create: jest.fn().mockResolvedValue('Texto transcrito de prueba'),
                },
            },
        })),
    };
});

// Mock de LangChain
jest.mock('@langchain/openai', () => ({
    ChatOpenAI: jest.fn().mockImplementation(() => ({
        // Mock del modelo de chat
    })),
}));

jest.mock('langchain/chains', () => ({
    loadSummarizationChain: jest.fn().mockReturnValue({
        call: jest.fn().mockResolvedValue({
            text: 'Resumen de prueba del texto transcrito.',
        }),
    }),
}));

jest.mock('langchain/document', () => ({
    Document: jest.fn().mockImplementation(({ pageContent, metadata }) => ({
        pageContent,
        metadata,
    })),
}));

describe('AudioService', () => {
    let service: AudioService;
    let configService: ConfigService;

    const mockConfigService = {
        get: jest.fn().mockReturnValue('test-api-key'),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AudioService,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<AudioService>(AudioService);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('summarizeAudio', () => {
        it('should process audio file and return summary', async () => {
            const mockFile = {
                originalname: 'test.mp3',
                mimetype: 'audio/mpeg',
                size: 1000,
                buffer: Buffer.from('test audio data'),
            } as Express.Multer.File;

            const result = await service.summarizeAudio(mockFile);

            expect(result).toHaveProperty('summary');
            expect(typeof result.summary).toBe('string');
            expect(result.summary).toBe('Resumen de prueba del texto transcrito.');
        });

        it('should handle errors gracefully', async () => {
            const mockFile = {
                originalname: 'test.mp3',
                mimetype: 'audio/mpeg',
                size: 1000,
                buffer: Buffer.from('test audio data'),
            } as Express.Multer.File;

            // Mock error en transcripción
            const OpenAI = require('openai').default;
            const mockOpenAI = new OpenAI();
            mockOpenAI.audio.transcriptions.create.mockRejectedValue(
                new Error('Transcription failed')
            );

            await expect(service.summarizeAudio(mockFile)).rejects.toThrow();
        });
    });
});
