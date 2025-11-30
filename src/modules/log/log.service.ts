import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Log, LogDocument, LogType, LogSeverity } from './schemas/log.schema';
import { CreateLogDto } from './dto/create-log.dto';
import { UpdateLogDto } from './dto/update-log.dto';

export interface LogFilters {
  type?: LogType;
  severity?: LogSeverity;
  companyId?: string;
  userId?: string;
  source?: string;
  resolved?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
}

@Injectable()
export class LogService {
  constructor(@InjectModel(Log.name) private readonly logModel: Model<LogDocument>) {}

  async create(dto: CreateLogDto): Promise<Log> {
    // Validar que si es tipo ERROR, debe tener severity
    if (dto.type === LogType.ERROR && !dto.severity) {
      throw new BadRequestException('Error logs must have a severity level');
    }

    const logData: Record<string, unknown> = {
      type: dto.type,
      message: dto.message,
    };

    if (dto.severity) logData.severity = dto.severity;
    if (dto.description) logData.description = dto.description;
    if (dto.companyId) {
      if (!Types.ObjectId.isValid(dto.companyId)) {
        throw new BadRequestException('Invalid companyId format');
      }
      logData.companyId = new Types.ObjectId(dto.companyId);
    }
    if (dto.userId) {
      if (!Types.ObjectId.isValid(dto.userId)) {
        throw new BadRequestException('Invalid userId format');
      }
      logData.userId = new Types.ObjectId(dto.userId);
    }
    if (dto.source) logData.source = dto.source;
    if (dto.stackTrace) logData.stackTrace = dto.stackTrace;
    if (dto.metadata) logData.metadata = dto.metadata;
    if (dto.endpoint) logData.endpoint = dto.endpoint;
    if (dto.method) logData.method = dto.method;
    if (dto.statusCode !== undefined) logData.statusCode = dto.statusCode;
    if (dto.ipAddress) logData.ipAddress = dto.ipAddress;
    if (dto.userAgent) logData.userAgent = dto.userAgent;
    if (dto.resolved !== undefined) logData.resolved = dto.resolved;
    if (dto.resolvedAt) logData.resolvedAt = dto.resolvedAt;
    if (dto.resolvedBy) {
      if (!Types.ObjectId.isValid(dto.resolvedBy)) {
        throw new BadRequestException('Invalid resolvedBy format');
      }
      logData.resolvedBy = new Types.ObjectId(dto.resolvedBy);
    }

    const created = await this.logModel.create(logData);
    return created.toObject();
  }

  async findAll(filters: LogFilters = {}): Promise<Log[]> {
    const query: Record<string, unknown> = {};

    if (filters.type) query.type = filters.type;
    if (filters.severity) query.severity = filters.severity;
    if (filters.companyId) {
      if (!Types.ObjectId.isValid(filters.companyId)) {
        throw new BadRequestException('Invalid companyId format');
      }
      query.companyId = new Types.ObjectId(filters.companyId);
    }
    if (filters.userId) {
      if (!Types.ObjectId.isValid(filters.userId)) {
        throw new BadRequestException('Invalid userId format');
      }
      query.userId = new Types.ObjectId(filters.userId);
    }
    if (filters.source) query.source = filters.source;
    if (filters.resolved !== undefined) query.resolved = filters.resolved;

    if (filters.startDate || filters.endDate) {
      const dateQuery: { $gte?: Date; $lte?: Date } = {};
      if (filters.startDate) dateQuery.$gte = filters.startDate;
      if (filters.endDate) dateQuery.$lte = filters.endDate;
      query.createdAt = dateQuery;
    }

    const limit = filters.limit || 100;
    const skip = filters.skip || 0;

    return this.logModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean()
      .exec() as Promise<Log[]>;
  }

  async findById(id: string): Promise<Log | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    return this.logModel.findById(id).lean().exec() as Promise<Log | null>;
  }

  async findByCompany(companyId: string, filters: Omit<LogFilters, 'companyId'> = {}): Promise<Log[]> {
    return this.findAll({ ...filters, companyId });
  }

  async findByUser(userId: string, filters: Omit<LogFilters, 'userId'> = {}): Promise<Log[]> {
    return this.findAll({ ...filters, userId });
  }

  async findErrors(filters: Omit<LogFilters, 'type'> = {}): Promise<Log[]> {
    return this.findAll({ ...filters, type: LogType.ERROR });
  }

  async findNotifications(filters: Omit<LogFilters, 'type'> = {}): Promise<Log[]> {
    return this.findAll({ ...filters, type: LogType.NOTIFICATION });
  }

  async findUnresolvedErrors(filters: Omit<LogFilters, 'resolved' | 'type'> = {}): Promise<Log[]> {
    return this.findAll({ ...filters, type: LogType.ERROR, resolved: false });
  }

  async update(id: string, update: UpdateLogDto): Promise<Log | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const updateDoc: Record<string, unknown> = {};

    if (update.type !== undefined) updateDoc.type = update.type;
    if (update.severity !== undefined) updateDoc.severity = update.severity;
    if (update.message !== undefined) updateDoc.message = update.message;
    if (update.description !== undefined) updateDoc.description = update.description;
    if (update.companyId !== undefined) {
      if (!Types.ObjectId.isValid(update.companyId)) {
        throw new BadRequestException('Invalid companyId format');
      }
      updateDoc.companyId = new Types.ObjectId(update.companyId);
    }
    if (update.userId !== undefined) {
      if (!Types.ObjectId.isValid(update.userId)) {
        throw new BadRequestException('Invalid userId format');
      }
      updateDoc.userId = new Types.ObjectId(update.userId);
    }
    if (update.source !== undefined) updateDoc.source = update.source;
    if (update.stackTrace !== undefined) updateDoc.stackTrace = update.stackTrace;
    if (update.metadata !== undefined) updateDoc.metadata = update.metadata;
    if (update.endpoint !== undefined) updateDoc.endpoint = update.endpoint;
    if (update.method !== undefined) updateDoc.method = update.method;
    if (update.statusCode !== undefined) updateDoc.statusCode = update.statusCode;
    if (update.ipAddress !== undefined) updateDoc.ipAddress = update.ipAddress;
    if (update.userAgent !== undefined) updateDoc.userAgent = update.userAgent;
    if (update.resolved !== undefined) {
      updateDoc.resolved = update.resolved;
      if (update.resolved && !update.resolvedAt) {
        updateDoc.resolvedAt = new Date();
      }
    }
    if (update.resolvedAt !== undefined) updateDoc.resolvedAt = update.resolvedAt;
    if (update.resolvedBy !== undefined) {
      if (!Types.ObjectId.isValid(update.resolvedBy)) {
        throw new BadRequestException('Invalid resolvedBy format');
      }
      updateDoc.resolvedBy = new Types.ObjectId(update.resolvedBy);
    }

    return this.logModel
      .findByIdAndUpdate(id, updateDoc, { new: true })
      .lean()
      .exec() as Promise<Log | null>;
  }

  async markAsResolved(id: string, resolvedBy?: string): Promise<Log | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const updateDoc: Record<string, unknown> = {
      resolved: true,
      resolvedAt: new Date(),
    };

    if (resolvedBy) {
      if (!Types.ObjectId.isValid(resolvedBy)) {
        throw new BadRequestException('Invalid resolvedBy format');
      }
      updateDoc.resolvedBy = new Types.ObjectId(resolvedBy);
    }

    return this.logModel
      .findByIdAndUpdate(id, updateDoc, { new: true })
      .lean()
      .exec() as Promise<Log | null>;
  }

  async deleteById(id: string): Promise<Log | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    const deleted = await this.logModel.findByIdAndDelete(id).lean().exec();
    if (!deleted) {
      throw new NotFoundException(`Log with ID ${id} not found`);
    }
    return deleted as Log;
  }

  async getStats(companyId?: string, startDate?: Date, endDate?: Date): Promise<{
    total: number;
    errors: number;
    notifications: number;
    bySeverity: Record<LogSeverity, number>;
    unresolved: number;
  }> {
    const query: Record<string, unknown> = {};

    if (companyId) {
      if (!Types.ObjectId.isValid(companyId)) {
        throw new BadRequestException('Invalid companyId format');
      }
      query.companyId = new Types.ObjectId(companyId);
    }

    if (startDate || endDate) {
      const dateQuery: { $gte?: Date; $lte?: Date } = {};
      if (startDate) dateQuery.$gte = startDate;
      if (endDate) dateQuery.$lte = endDate;
      query.createdAt = dateQuery;
    }

    const [total, errors, notifications, unresolved] = await Promise.all([
      this.logModel.countDocuments(query).exec(),
      this.logModel.countDocuments({ ...query, type: LogType.ERROR }).exec(),
      this.logModel.countDocuments({ ...query, type: LogType.NOTIFICATION }).exec(),
      this.logModel.countDocuments({ ...query, type: LogType.ERROR, resolved: false }).exec(),
    ]);

    const bySeverity = {
      [LogSeverity.LOW]: 0,
      [LogSeverity.MEDIUM]: 0,
      [LogSeverity.HIGH]: 0,
      [LogSeverity.CRITICAL]: 0,
    };

    const severityCounts = await this.logModel
      .aggregate([
        { $match: { ...query, type: LogType.ERROR, severity: { $exists: true } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ])
      .exec();

    severityCounts.forEach((item) => {
      if (item._id && bySeverity[item._id as LogSeverity] !== undefined) {
        bySeverity[item._id as LogSeverity] = item.count;
      }
    });

    return {
      total,
      errors,
      notifications,
      bySeverity,
      unresolved,
    };
  }
}

