import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AudioController } from './audio.controller';
import { AudioService } from './audio.service';

@Module({
    imports: [ConfigModule],
    controllers: [AudioController],
    providers: [AudioService],
    exports: [AudioService],
})
export class AudioModule { }
