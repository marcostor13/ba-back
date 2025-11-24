import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from './schemas/company.schema';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel(Company.name) private readonly companyModel: Model<CompanyDocument>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const created = await this.companyModel.create(createCompanyDto);
    return created.toObject();
  }

  async findAll(activeOnly?: boolean): Promise<Company[]> {
    const filter: Record<string, unknown> = {};
    if (activeOnly !== undefined) {
      filter.active = activeOnly;
    }
    return this.companyModel.find(filter).sort({ name: 1 }).lean().exec() as Promise<Company[]>;
  }

  async findById(id: string): Promise<Company | null> {
    return this.companyModel.findById(id).lean().exec() as Promise<Company | null>;
  }

  async findByName(name: string): Promise<Company | null> {
    return this.companyModel.findOne({ name }).lean().exec() as Promise<Company | null>;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company | null> {
    const updated = await this.companyModel
      .findByIdAndUpdate(id, updateCompanyDto, { new: true })
      .lean()
      .exec();
    if (!updated) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
    return updated as Company;
  }

  async remove(id: string): Promise<Company | null> {
    const deleted = await this.companyModel.findByIdAndDelete(id).lean().exec();
    if (!deleted) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }
    return deleted as Company;
  }
}

