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
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project, ProjectStatus } from './schemas/project.schema';
import { RoleService } from '../role/role.service';
import { CustomerService } from '../customer/customer.service';

const validationPipe = new ValidationPipe({ transform: true, whitelist: true });

@Controller('project')
@UseGuards(AuthGuard('jwt'))
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly roleService: RoleService,
    private readonly customerService: CustomerService,
  ) { }

  @Post()
  async create(@Body(validationPipe) createProjectDto: CreateProjectDto, @Request() req): Promise<Project> {
    const role = await this.roleService.findByUserId(req.user.userId);
    if (role?.name === 'customer') {
      throw new ForbiddenException('Customers cannot create projects');
    }
    return this.projectService.create(createProjectDto);
  }

  @Get()
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  async findAll(
    @Request() req,
    @Query('companyId') companyId?: string,
    @Query('customerId') customerId?: string,
    @Query('estimatorId') estimatorId?: string,
    @Query('status') status?: ProjectStatus,
  ): Promise<Project[]> {
    const role = await this.roleService.findByUserId(req.user.userId);
    
    // Si es customer, forzar el filtro por su customerId
    if (role?.name === 'customer') {
      const customer = await this.customerService.findByUserId(req.user.userId);
      if (!customer) {
        return [];
      }
      // Sobreescribir customerId con el del usuario actual
      return this.projectService.findAll(companyId, customer._id.toString(), estimatorId, status);
    }

    return this.projectService.findAll(companyId, customerId, estimatorId, status);
  }

  @Get(':id/timeline')
  async getTimeline(@Param('id') id: string, @Request() req) {
    const role = await this.roleService.findByUserId(req.user.userId);
    if (role?.name === 'customer') {
      const project = await this.projectService.findById(id);
      if (!project) throw new NotFoundException('Project not found');
      
      const customer = await this.customerService.findByUserId(req.user.userId);
      if (!customer || project.customerId.toString() !== customer._id.toString()) {
        throw new ForbiddenException('Access denied');
      }
    }
    return this.projectService.getTimeline(id);
  }

  @Get(':id')
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  async findOne(@Param('id') id: string, @Request() req): Promise<Project | null> {
    const project = await this.projectService.findById(id);
    if (!project) return null;

    const role = await this.roleService.findByUserId(req.user.userId);
    if (role?.name === 'customer') {
      const customer = await this.customerService.findByUserId(req.user.userId);
      if (!customer || project.customerId.toString() !== customer._id.toString()) {
        throw new ForbiddenException('Access denied');
      }
    }

    return project;
  }

  @Patch(':id')
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  async update(
    @Param('id') id: string,
    @Body(validationPipe) updateProjectDto: UpdateProjectDto,
    @Request() req,
  ): Promise<Project | null> {
    const role = await this.roleService.findByUserId(req.user.userId);
    if (role?.name === 'customer') {
      throw new ForbiddenException('Customers cannot update projects');
    }
    return this.projectService.update(id, updateProjectDto);
  }

  @Post(':id/update')
  async addUpdate(
    @Param('id') id: string,
    @Body(validationPipe)
    body: { title: string; description: string; userId: string; attachments?: string[] },
    @Request() req,
  ): Promise<Project | null> {
    const role = await this.roleService.findByUserId(req.user.userId);
    if (role?.name === 'customer') {
      throw new ForbiddenException('Customers cannot add updates manually');
    }
    return this.projectService.addUpdate(id, body);
  }

  @Delete(':id')
  // @ts-ignore - TypeScript inference limit with complex Mongoose types
  async remove(@Param('id') id: string, @Request() req): Promise<Project | null> {
    const role = await this.roleService.findByUserId(req.user.userId);
    if (role?.name === 'customer') {
      throw new ForbiddenException('Customers cannot delete projects');
    }
    return this.projectService.deleteById(id);
  }
}

