import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { Appointment } from './schemas/appointment.schema';

const validationPipe = new ValidationPipe({ transform: true, whitelist: true });

@Controller('appointment')
@UseGuards(AuthGuard('jwt'))
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  @Get()
  findByProject(@Query('projectId') projectId: string): Promise<Appointment[]> {
    return this.appointmentService.findByProject(projectId);
  }

  @Post()
  create(
    @Body(validationPipe) dto: CreateAppointmentDto,
    @Request() req: { user?: { userId?: string } },
  ): Promise<Appointment> {
    return this.appointmentService.create(dto, req.user?.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Appointment | null> {
    return this.appointmentService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(validationPipe) dto: UpdateAppointmentDto,
  ): Promise<Appointment | null> {
    return this.appointmentService.update(id, dto);
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string): Promise<Appointment | null> {
    return this.appointmentService.confirm(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.appointmentService.remove(id);
  }
}
