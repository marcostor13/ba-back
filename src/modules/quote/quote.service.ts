import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { Quote, QuoteStatus, QuoteCategory } from './schemas/quote.schema';
import { Project } from '../project/schemas/project.schema';

@Injectable()
export class QuoteService {
  constructor(
    @InjectModel(Quote.name) private readonly quoteModel: Model<Quote>,
    @InjectModel(Project.name) private readonly projectModel: Model<Project>,
  ) { }

  async create(dto: CreateQuoteRequestDto): Promise<Quote> {
    // Validar que el proyecto exista
    if (!Types.ObjectId.isValid(dto.projectId)) {
      throw new BadRequestException('Invalid projectId format');
    }

    const project = await this.projectModel.findById(dto.projectId).lean().exec();
    if (!project) {
      throw new NotFoundException(`Project with ID ${dto.projectId} not found`);
    }

    // Validar que el proyecto pertenezca a la misma compañía
    if (project.companyId.toString() !== dto.companyId) {
      throw new BadRequestException('Project companyId does not match quote companyId');
    }

    const quoteData: Record<string, unknown> = {
      customerId: new Types.ObjectId(dto.customerId),
      companyId: new Types.ObjectId(dto.companyId),
      projectId: new Types.ObjectId(dto.projectId),
      experience: dto.experience,
      category: dto.category,
      userId: new Types.ObjectId(dto.userId),
      versionNumber: dto.versionNumber,
      totalPrice: dto.totalPrice,
      status: dto.status || QuoteStatus.DRAFT,
    };

    if (dto.kitchenInformation) quoteData.kitchenInformation = dto.kitchenInformation;
    if (dto.bathroomInformation) quoteData.bathroomInformation = dto.bathroomInformation;
    if (dto.basementInformation) quoteData.basementInformation = dto.basementInformation;
    if (dto.additionalWorkInformation) quoteData.additionalWorkInformation = dto.additionalWorkInformation;
    if (dto.countertopsFiles) quoteData.countertopsFiles = dto.countertopsFiles;
    if (dto.backsplashFiles) quoteData.backsplashFiles = dto.backsplashFiles;
    if (dto.notes) quoteData.notes = dto.notes;
    if (dto.materials !== undefined) quoteData.materials = dto.materials;

    const created = await this.quoteModel.create(quoteData);
    return created.toObject();
  }

  async findAll(
    companyId?: string,
    projectId?: string,
    category?: QuoteCategory,
    status?: QuoteStatus,
    userId?: string,
  ): Promise<Quote[]> {
    const filter: Record<string, unknown> = {};

    if (companyId) {
      if (!Types.ObjectId.isValid(companyId)) {
        throw new BadRequestException('Invalid companyId format');
      }
      filter.companyId = new Types.ObjectId(companyId);
    }

    if (projectId) {
      if (!Types.ObjectId.isValid(projectId)) {
        throw new BadRequestException('Invalid projectId format');
      }
      filter.projectId = new Types.ObjectId(projectId);
    }

    if (category) filter.category = category;
    if (status) filter.status = status;

    if (userId) {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid userId format');
      }
      filter.userId = new Types.ObjectId(userId);
    }

    return this.quoteModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean()
      .exec() as Promise<Quote[]>;
  }

  async findById(id: string): Promise<Quote> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const quote = await this.quoteModel
      .findById(id)
      .populate('customerId', 'name lastName email phone address city zipCode state leadSource description')
      .populate('companyId', 'name description active configuration')
      .lean()
      .exec();

    if (!quote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }

    return quote as Quote;
  }

  async findByProjectId(projectId: string): Promise<Quote[]> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId format');
    }

    return this.quoteModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .sort({ versionNumber: 1, createdAt: -1 })
      .lean()
      .exec() as Promise<Quote[]>;
  }

  async findVersions(projectId: string, versionNumber?: number): Promise<Quote[]> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId format');
    }

    const filter: Record<string, unknown> = {
      projectId: new Types.ObjectId(projectId),
    };

    if (versionNumber !== undefined) {
      filter.versionNumber = versionNumber;
    }

    return this.quoteModel
      .find(filter)
      .sort({ versionNumber: 1 })
      .lean()
      .exec() as Promise<Quote[]>;
  }

  async update(id: string, updateDto: UpdateQuoteDto): Promise<Quote> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const existingQuote = await this.quoteModel.findById(id).exec();
    if (!existingQuote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }

    // Actualizar campos básicos
    if (updateDto.customerId) {
      existingQuote.customerId = new Types.ObjectId(updateDto.customerId) as any;
    }
    if (updateDto.companyId) {
      existingQuote.companyId = new Types.ObjectId(updateDto.companyId) as any;
    }
    if (updateDto.projectId) {
      existingQuote.projectId = new Types.ObjectId(updateDto.projectId) as any;
    }
    if (updateDto.experience !== undefined) {
      existingQuote.experience = updateDto.experience;
    }
    if (updateDto.category !== undefined) {
      existingQuote.category = updateDto.category;
    }
    if (updateDto.userId) {
      existingQuote.userId = new Types.ObjectId(updateDto.userId) as any;
    }
    if (updateDto.versionNumber !== undefined) {
      existingQuote.versionNumber = updateDto.versionNumber;
    }
    if (updateDto.status !== undefined) {
      existingQuote.status = updateDto.status;
    }
    if (updateDto.totalPrice !== undefined) {
      existingQuote.totalPrice = updateDto.totalPrice;
    }
    if (updateDto.notes !== undefined) {
      existingQuote.notes = updateDto.notes;
    }
    if (updateDto.kitchenInformation !== undefined) {
      existingQuote.kitchenInformation = updateDto.kitchenInformation as any;
    }
    if (updateDto.bathroomInformation !== undefined) {
      existingQuote.bathroomInformation = updateDto.bathroomInformation as any;
    }
    if (updateDto.basementInformation !== undefined) {
      existingQuote.basementInformation = updateDto.basementInformation as any;
    }
    if (updateDto.additionalWorkInformation !== undefined) {
      existingQuote.additionalWorkInformation = updateDto.additionalWorkInformation as any;
    }
    if (updateDto.countertopsFiles !== undefined) {
      existingQuote.countertopsFiles = updateDto.countertopsFiles;
    }
    if (updateDto.backsplashFiles !== undefined) {
      existingQuote.backsplashFiles = updateDto.backsplashFiles;
    }
    if (updateDto.materials !== undefined) {
      existingQuote.materials = updateDto.materials as any;
    }

    await existingQuote.save();
    return existingQuote.toObject();
  }

  async delete(id: string): Promise<Quote> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const deleted = await this.quoteModel.findByIdAndDelete(id).lean().exec();
    if (!deleted) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }

    return deleted as Quote;
  }
}