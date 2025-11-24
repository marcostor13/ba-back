import {
  IsString,
  IsOptional,
  IsMongoId,
  IsEnum,
  IsDate,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus, ProjectType } from '../schemas/project.schema';

class MilestoneDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  dueDate?: Date;

  @IsOptional()
  completed?: boolean;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  completedDate?: Date;
}

class ProjectUpdateDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsDate()
  @Type(() => Date)
  date: Date;

  @IsMongoId()
  userId: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProjectType)
  projectType: ProjectType;

  @IsMongoId()
  companyId: string;

  @IsMongoId()
  customerId: string;

  @IsMongoId()
  estimatorId: string;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  expectedEndDate?: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  actualEndDate?: Date;

  @IsNumber()
  @IsOptional()
  budget?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  @IsOptional()
  milestones?: MilestoneDto[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  @IsMongoId()
  approvedQuoteId?: string;
}

