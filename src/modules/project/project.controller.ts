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
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project, ProjectStatus } from './schemas/project.schema';

const validationPipe = new ValidationPipe({ transform: true, whitelist: true });

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) { }

  @Post()
  async create(@Body(validationPipe) createProjectDto: CreateProjectDto): Promise<Project> {
    return this.projectService.create(createProjectDto);
  }

  @Get()
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  findAll(
    @Query('companyId') companyId?: string,
    @Query('customerId') customerId?: string,
    @Query('estimatorId') estimatorId?: string,
    @Query('status') status?: ProjectStatus,
  ): Promise<Project[]> {
    return this.projectService.findAll(companyId, customerId, estimatorId, status);
  }

  @Get(':id')
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  findOne(@Param('id') id: string): Promise<Project | null> {
    return this.projectService.findById(id);
  }

  @Patch(':id')
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  update(
    @Param('id') id: string,
    @Body(validationPipe) updateProjectDto: UpdateProjectDto,
  ): Promise<Project | null> {
    return this.projectService.update(id, updateProjectDto);
  }

  @Post(':id/update')
  async addUpdate(
    @Param('id') id: string,
    @Body(validationPipe)
    body: { title: string; description: string; userId: string; attachments?: string[] },
  ): Promise<Project | null> {
    return this.projectService.addUpdate(id, body);
  }

  @Delete(':id')
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  remove(@Param('id') id: string): Promise<Project | null> {
    return this.projectService.deleteById(id);
  }
}

