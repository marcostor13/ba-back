import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { AudioController } from './audio.controller';
import { AudioService } from './audio.service';

describe('AudioController', () => {
    let controller: AudioController;
    let service: AudioService;

    const mockAudioService = {
        summarizeAudio: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AudioController],
            providers: [
                {
                    provide: AudioService,
                    useValue: mockAudioService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        controller = module.get<AudioController>(AudioController);
        service = module.get<AudioService>(AudioService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('summarizeAudio', () => {
        it('should throw BadRequestException when no file is provided', async () => {
            await expect(controller.summarizeAudio(null)).rejects.toThrow(
                BadRequestException
            );
        });

        it('should throw BadRequestException for invalid file type', async () => {
            const mockFile = {
                originalname: 'test.txt',
                mimetype: 'text/plain',
                size: 1000,
                buffer: Buffer.from('test'),
            } as Express.Multer.File;

            await expect(controller.summarizeAudio(mockFile)).rejects.toThrow(
                BadRequestException
            );
        });

        it('should throw BadRequestException for file too large', async () => {
            const mockFile = {
                originalname: 'test.mp3',
                mimetype: 'audio/mpeg',
                size: 30 * 1024 * 1024, // 30MB
                buffer: Buffer.from('test'),
            } as Express.Multer.File;

            await expect(controller.summarizeAudio(mockFile)).rejects.toThrow(
                BadRequestException
            );
        });

        it('should successfully process valid audio file', async () => {
            const mockFile = {
                originalname: 'test.mp3',
                mimetype: 'audio/mpeg',
                size: 1000,
                buffer: Buffer.from('test'),
            } as Express.Multer.File;

            const expectedResult = {
                summary: 'Este es un resumen de prueba del audio.',
            };

            mockAudioService.summarizeAudio.mockResolvedValue(expectedResult);

            const result = await controller.summarizeAudio(mockFile);

            expect(result).toEqual({
                success: true,
                data: expectedResult,
                message: 'Audio procesado y resumido exitosamente',
            });
            expect(mockAudioService.summarizeAudio).toHaveBeenCalledWith(mockFile);
        });
    });
});
