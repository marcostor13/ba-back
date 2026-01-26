import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StatusHistory, StatusHistoryDocument } from './schemas/status-history.schema';

@Injectable()
export class StatusHistoryService {
  constructor(
    @InjectModel(StatusHistory.name)
    private readonly statusHistoryModel: Model<StatusHistoryDocument>,
  ) {}

  async recordTransition(params: {
    entityId: string | Types.ObjectId;
    entityType: 'quote' | 'project';
    fromStatus?: string;
    toStatus: string;
    userId?: string | Types.ObjectId;
    companyId: string | Types.ObjectId;
  }) {
    const history = new this.statusHistoryModel({
      entityId: new Types.ObjectId(params.entityId),
      entityType: params.entityType,
      fromStatus: params.fromStatus,
      toStatus: params.toStatus,
      userId: params.userId ? new Types.ObjectId(params.userId) : undefined,
      companyId: new Types.ObjectId(params.companyId),
    });
    return history.save();
  }

  async getAverageTimePerStage(companyId: string, entityType: 'quote' | 'project', startDate?: Date, endDate?: Date) {
    const match: any = {
      companyId: new Types.ObjectId(companyId),
      entityType,
    };

    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = startDate;
      if (endDate) match.createdAt.$lte = endDate;
    }

    // This is a complex aggregation to calculate time between transitions
    // For simplicity in this first version, we'll calculate the time spent in each "fromStatus"
    // by looking at the next transition for the same entityId.
    
    const results = await this.statusHistoryModel.aggregate([
      { $match: match },
      { $sort: { entityId: 1, createdAt: 1 } },
      {
        $group: {
          _id: '$entityId',
          transitions: {
            $push: {
              status: '$toStatus',
              date: '$createdAt',
            },
          },
        },
      },
    ]).exec();

    const stageTimes: Record<string, { totalTime: number; count: number }> = {};

    results.forEach((entity) => {
      const transitions = entity.transitions;
      for (let i = 0; i < transitions.length - 1; i++) {
        const current = transitions[i];
        const next = transitions[i + 1];
        const duration = next.date.getTime() - current.date.getTime();
        
        if (!stageTimes[current.status]) {
          stageTimes[current.status] = { totalTime: 0, count: 0 };
        }
        stageTimes[current.status].totalTime += duration;
        stageTimes[current.status].count += 1;
      }
    });

    const report: Record<string, number> = {};
    for (const stage in stageTimes) {
      // Return average days
      report[stage] = parseFloat((stageTimes[stage].totalTime / stageTimes[stage].count / (1000 * 60 * 60 * 24)).toFixed(2));
    }

    return report;
  }
}
