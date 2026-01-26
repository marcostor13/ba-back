import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatusHistory, StatusHistorySchema } from './schemas/status-history.schema';
import { StatusHistoryService } from './status-history.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: StatusHistory.name, schema: StatusHistorySchema }]),
  ],
  providers: [StatusHistoryService],
  exports: [StatusHistoryService],
})
export class StatusHistoryModule {}
