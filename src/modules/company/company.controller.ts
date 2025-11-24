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
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from './schemas/company.schema';

const validationPipe = new ValidationPipe({ transform: true, whitelist: true });

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  async create(@Body(validationPipe) createCompanyDto: CreateCompanyDto): Promise<Company> {
    return this.companyService.create(createCompanyDto);
  }

  @Get()
  async findAll(@Query('activeOnly') activeOnly?: string): Promise<Company[]> {
    const activeOnlyBool = activeOnly === 'true' ? true : activeOnly === 'false' ? false : undefined;
    return this.companyService.findAll(activeOnlyBool);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Company | null> {
    return this.companyService.findById(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(validationPipe) updateCompanyDto: UpdateCompanyDto,
  ): Promise<Company | null> {
    return this.companyService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<Company | null> {
    return this.companyService.remove(id);
  }
}

