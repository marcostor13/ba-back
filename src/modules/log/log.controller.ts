import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { LogService } from './log.service';
import { CreateLogDto } from './dto/create-log.dto';
import { UpdateLogDto } from './dto/update-log.dto';
import { Log, LogType, LogSeverity } from './schemas/log.schema';

const validationPipe = new ValidationPipe({ transform: true, whitelist: true });

@Controller('log')
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Post()
  async create(@Body(validationPipe) createLogDto: CreateLogDto): Promise<Log> {
    return this.logService.create(createLogDto);
  }

  @Get()
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  findAll(
    @Query('type') type?: LogType,
    @Query('severity') severity?: LogSeverity,
    @Query('companyId') companyId?: string,
    @Query('userId') userId?: string,
    @Query('source') source?: string,
    @Query('resolved') resolved?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ): Promise<Log[]> {
    const filters: {
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
    } = {};

    if (type) {
      if (!Object.values(LogType).includes(type)) {
        throw new BadRequestException(`Invalid type. Must be one of: ${Object.values(LogType).join(', ')}`);
      }
      filters.type = type;
    }
    if (severity) {
      if (!Object.values(LogSeverity).includes(severity)) {
        throw new BadRequestException(
          `Invalid severity. Must be one of: ${Object.values(LogSeverity).join(', ')}`,
        );
      }
      filters.severity = severity;
    }
    if (companyId) filters.companyId = companyId;
    if (userId) filters.userId = userId;
    if (source) filters.source = source;
    if (resolved !== undefined) {
      filters.resolved = resolved === 'true';
    }
    if (startDate) {
      const date = new Date(startDate);
      if (isNaN(date.getTime())) {
        throw new BadRequestException('Invalid startDate format');
      }
      filters.startDate = date;
    }
    if (endDate) {
      const date = new Date(endDate);
      if (isNaN(date.getTime())) {
        throw new BadRequestException('Invalid endDate format');
      }
      filters.endDate = date;
    }
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1) {
        throw new BadRequestException('Invalid limit. Must be a positive number');
      }
      filters.limit = limitNum;
    }
    if (skip) {
      const skipNum = parseInt(skip, 10);
      if (isNaN(skipNum) || skipNum < 0) {
        throw new BadRequestException('Invalid skip. Must be a non-negative number');
      }
      filters.skip = skipNum;
    }

    return this.logService.findAll(filters);
  }

  @Get('errors')
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  findErrors(
    @Query('severity') severity?: LogSeverity,
    @Query('companyId') companyId?: string,
    @Query('userId') userId?: string,
    @Query('source') source?: string,
    @Query('resolved') resolved?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ): Promise<Log[]> {
    const filters: {
      severity?: LogSeverity;
      companyId?: string;
      userId?: string;
      source?: string;
      resolved?: boolean;
      limit?: number;
      skip?: number;
    } = {};

    if (severity) {
      if (!Object.values(LogSeverity).includes(severity)) {
        throw new BadRequestException(
          `Invalid severity. Must be one of: ${Object.values(LogSeverity).join(', ')}`,
        );
      }
      filters.severity = severity;
    }
    if (companyId) filters.companyId = companyId;
    if (userId) filters.userId = userId;
    if (source) filters.source = source;
    if (resolved !== undefined) {
      filters.resolved = resolved === 'true';
    }
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1) {
        throw new BadRequestException('Invalid limit. Must be a positive number');
      }
      filters.limit = limitNum;
    }
    if (skip) {
      const skipNum = parseInt(skip, 10);
      if (isNaN(skipNum) || skipNum < 0) {
        throw new BadRequestException('Invalid skip. Must be a non-negative number');
      }
      filters.skip = skipNum;
    }

    return this.logService.findErrors(filters);
  }

  @Get('notifications')
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  findNotifications(
    @Query('companyId') companyId?: string,
    @Query('userId') userId?: string,
    @Query('source') source?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ): Promise<Log[]> {
    const filters: {
      companyId?: string;
      userId?: string;
      source?: string;
      limit?: number;
      skip?: number;
    } = {};

    if (companyId) filters.companyId = companyId;
    if (userId) filters.userId = userId;
    if (source) filters.source = source;
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1) {
        throw new BadRequestException('Invalid limit. Must be a positive number');
      }
      filters.limit = limitNum;
    }
    if (skip) {
      const skipNum = parseInt(skip, 10);
      if (isNaN(skipNum) || skipNum < 0) {
        throw new BadRequestException('Invalid skip. Must be a non-negative number');
      }
      filters.skip = skipNum;
    }

    return this.logService.findNotifications(filters);
  }

  @Get('unresolved-errors')
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  findUnresolvedErrors(
    @Query('severity') severity?: LogSeverity,
    @Query('companyId') companyId?: string,
    @Query('userId') userId?: string,
    @Query('source') source?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ): Promise<Log[]> {
    const filters: {
      severity?: LogSeverity;
      companyId?: string;
      userId?: string;
      source?: string;
      limit?: number;
      skip?: number;
    } = {};

    if (severity) {
      if (!Object.values(LogSeverity).includes(severity)) {
        throw new BadRequestException(
          `Invalid severity. Must be one of: ${Object.values(LogSeverity).join(', ')}`,
        );
      }
      filters.severity = severity;
    }
    if (companyId) filters.companyId = companyId;
    if (userId) filters.userId = userId;
    if (source) filters.source = source;
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1) {
        throw new BadRequestException('Invalid limit. Must be a positive number');
      }
      filters.limit = limitNum;
    }
    if (skip) {
      const skipNum = parseInt(skip, 10);
      if (isNaN(skipNum) || skipNum < 0) {
        throw new BadRequestException('Invalid skip. Must be a non-negative number');
      }
      filters.skip = skipNum;
    }

    return this.logService.findUnresolvedErrors(filters);
  }

  @Get('stats')
  async getStats(
    @Query('companyId') companyId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<{
    total: number;
    errors: number;
    notifications: number;
    bySeverity: Record<LogSeverity, number>;
    unresolved: number;
  }> {
    let startDateObj: Date | undefined;
    let endDateObj: Date | undefined;

    if (startDate) {
      startDateObj = new Date(startDate);
      if (isNaN(startDateObj.getTime())) {
        throw new BadRequestException('Invalid startDate format');
      }
    }
    if (endDate) {
      endDateObj = new Date(endDate);
      if (isNaN(endDateObj.getTime())) {
        throw new BadRequestException('Invalid endDate format');
      }
    }

    return this.logService.getStats(companyId, startDateObj, endDateObj);
  }

  @Get('company/:companyId')
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  findByCompany(
    @Param('companyId') companyId: string,
    @Query('type') type?: LogType,
    @Query('severity') severity?: LogSeverity,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ): Promise<Log[]> {
    const filters: {
      type?: LogType;
      severity?: LogSeverity;
      limit?: number;
      skip?: number;
    } = {};

    if (type) {
      if (!Object.values(LogType).includes(type)) {
        throw new BadRequestException(`Invalid type. Must be one of: ${Object.values(LogType).join(', ')}`);
      }
      filters.type = type;
    }
    if (severity) {
      if (!Object.values(LogSeverity).includes(severity)) {
        throw new BadRequestException(
          `Invalid severity. Must be one of: ${Object.values(LogSeverity).join(', ')}`,
        );
      }
      filters.severity = severity;
    }
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1) {
        throw new BadRequestException('Invalid limit. Must be a positive number');
      }
      filters.limit = limitNum;
    }
    if (skip) {
      const skipNum = parseInt(skip, 10);
      if (isNaN(skipNum) || skipNum < 0) {
        throw new BadRequestException('Invalid skip. Must be a non-negative number');
      }
      filters.skip = skipNum;
    }

    return this.logService.findByCompany(companyId, filters);
  }

  @Get('user/:userId')
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  findByUser(
    @Param('userId') userId: string,
    @Query('type') type?: LogType,
    @Query('severity') severity?: LogSeverity,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ): Promise<Log[]> {
    const filters: {
      type?: LogType;
      severity?: LogSeverity;
      limit?: number;
      skip?: number;
    } = {};

    if (type) {
      if (!Object.values(LogType).includes(type)) {
        throw new BadRequestException(`Invalid type. Must be one of: ${Object.values(LogType).join(', ')}`);
      }
      filters.type = type;
    }
    if (severity) {
      if (!Object.values(LogSeverity).includes(severity)) {
        throw new BadRequestException(
          `Invalid severity. Must be one of: ${Object.values(LogSeverity).join(', ')}`,
        );
      }
      filters.severity = severity;
    }
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1) {
        throw new BadRequestException('Invalid limit. Must be a positive number');
      }
      filters.limit = limitNum;
    }
    if (skip) {
      const skipNum = parseInt(skip, 10);
      if (isNaN(skipNum) || skipNum < 0) {
        throw new BadRequestException('Invalid skip. Must be a non-negative number');
      }
      filters.skip = skipNum;
    }

    return this.logService.findByUser(userId, filters);
  }

  @Get(':id')
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  findOne(@Param('id') id: string): Promise<Log | null> {
    return this.logService.findById(id);
  }

  @Patch(':id')
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  update(@Param('id') id: string, @Body(validationPipe) updateLogDto: UpdateLogDto): Promise<Log | null> {
    return this.logService.update(id, updateLogDto);
  }

  @Patch(':id/resolve')
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  markAsResolved(
    @Param('id') id: string,
    @Body(validationPipe) body: { resolvedBy?: string },
  ): Promise<Log | null> {
    return this.logService.markAsResolved(id, body.resolvedBy);
  }

  @Delete(':id')
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  remove(@Param('id') id: string): Promise<Log | null> {
    return this.logService.deleteById(id);
  }
}



