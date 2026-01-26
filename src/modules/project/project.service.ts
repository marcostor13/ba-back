import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument, ProjectStatus } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { StatusHistoryService } from '../status-history/status-history.service';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    private readonly statusHistoryService: StatusHistoryService,
  ) {}

  async create(dto: CreateProjectDto): Promise<Project> {
    const projectData: Record<string, unknown> = {
      name: dto.name,
      projectType: dto.projectType,
      companyId: new Types.ObjectId(dto.companyId),
      customerId: new Types.ObjectId(dto.customerId),
      estimatorId: new Types.ObjectId(dto.estimatorId),
      status: dto.status || ProjectStatus.PENDING,
    };

    if (dto.description) projectData.description = dto.description;
    if (dto.startDate) projectData.startDate = dto.startDate;
    if (dto.expectedEndDate) projectData.expectedEndDate = dto.expectedEndDate;
    if (dto.budget !== undefined) projectData.budget = dto.budget;
    if (dto.milestones) projectData.milestones = dto.milestones;
    if (dto.photos) projectData.photos = dto.photos;
    if (dto.notes) projectData.notes = dto.notes;
    if (dto.approvedQuoteId) projectData.approvedQuoteId = new Types.ObjectId(dto.approvedQuoteId);

    const created = await this.projectModel.create(projectData);
    
    // Record initial status
    await this.statusHistoryService.recordTransition({
      entityId: (created._id as Types.ObjectId).toString(),
      entityType: 'project',
      toStatus: created.status,
      userId: dto.estimatorId,
      companyId: dto.companyId,
    });

    return created.toObject();
  }

  async findAll(
    companyId?: string,
    customerId?: string,
    estimatorId?: string,
    status?: ProjectStatus,
  ): Promise<Project[]> {
    const filter: Record<string, unknown> = {};
    if (companyId) {
      if (!Types.ObjectId.isValid(companyId)) {
        throw new BadRequestException('Invalid companyId format');
      }
      filter.companyId = new Types.ObjectId(companyId);
    }
    if (customerId) {
      if (!Types.ObjectId.isValid(customerId)) {
        throw new BadRequestException('Invalid customerId format');
      }
      filter.customerId = new Types.ObjectId(customerId);
    }
    if (estimatorId) {
      if (!Types.ObjectId.isValid(estimatorId)) {
        throw new BadRequestException('Invalid estimatorId format');
      }
      filter.estimatorId = new Types.ObjectId(estimatorId);
    }
    if (status) filter.status = status;

    return this.projectModel.find(filter).sort({ createdAt: -1 }).lean().exec() as Promise<Project[]>;
  }

  async findById(id: string): Promise<Project | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    return this.projectModel.findById(id).lean().exec() as Promise<Project | null>;
  }

  async update(id: string, update: UpdateProjectDto): Promise<Project | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const existingProject = await this.projectModel.findById(id).exec();
    if (!existingProject) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const updateDoc: Record<string, unknown> = {};
    if (update.name !== undefined) updateDoc.name = update.name;
    if (update.description !== undefined) updateDoc.description = update.description;
    if (update.projectType !== undefined) updateDoc.projectType = update.projectType;
    if (update.companyId !== undefined) updateDoc.companyId = new Types.ObjectId(update.companyId);
    if (update.customerId !== undefined) updateDoc.customerId = new Types.ObjectId(update.customerId);
    if (update.estimatorId !== undefined) updateDoc.estimatorId = new Types.ObjectId(update.estimatorId);
    if (update.approvedQuoteId !== undefined) updateDoc.approvedQuoteId = new Types.ObjectId(update.approvedQuoteId);
    
    if (update.status !== undefined && update.status !== existingProject.status) {
      const fromStatus = existingProject.status;
      updateDoc.status = update.status;
      
      // Record transition
      await this.statusHistoryService.recordTransition({
        entityId: id,
        entityType: 'project',
        fromStatus,
        toStatus: update.status,
        userId: update.estimatorId || existingProject.estimatorId?.toString(),
        companyId: existingProject.companyId.toString(),
      });
    }

    if (update.startDate !== undefined) updateDoc.startDate = update.startDate;
    if (update.expectedEndDate !== undefined) updateDoc.expectedEndDate = update.expectedEndDate;
    if (update.actualEndDate !== undefined) updateDoc.actualEndDate = update.actualEndDate;
    if (update.budget !== undefined) updateDoc.budget = update.budget;
    if (update.milestones !== undefined) updateDoc.milestones = update.milestones;
    if (update.photos !== undefined) updateDoc.photos = update.photos;
    if (update.notes !== undefined) updateDoc.notes = update.notes;

    return this.projectModel
      .findByIdAndUpdate(id, updateDoc, { new: true })
      .lean()
      .exec() as Promise<Project | null>;
  }

  async addUpdate(
    id: string,
    update: { title: string; description: string; userId: string; attachments?: string[] },
  ): Promise<Project | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const project = await this.projectModel.findById(id);
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    const newUpdate: {
      title: string;
      description: string;
      date: Date;
      userId: Types.ObjectId;
      attachments?: string[];
    } = {
      title: update.title,
      description: update.description,
      date: new Date(),
      userId: new Types.ObjectId(update.userId) as Types.ObjectId,
      attachments: update.attachments || [],
    };

    if (!project.updates) {
      project.updates = [];
    }
    project.updates.push(newUpdate as any);

    const updated = await project.save();
    return updated.toObject();
  }

  async deleteById(id: string): Promise<Project | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    const deleted = await this.projectModel.findByIdAndDelete(id).lean().exec();
    if (!deleted) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return deleted as Project;
  }
}

