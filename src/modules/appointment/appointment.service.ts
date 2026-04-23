import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Appointment, AppointmentDocument, AppointmentStatus } from './schemas/appointment.schema';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { ProjectService } from '../project/project.service';
import { SmsService } from '../sms/sms.service';
import { CustomerService } from '../customer/customer.service';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    private readonly projectService: ProjectService,
    private readonly smsService: SmsService,
    private readonly customerService: CustomerService,
  ) {}

  async create(dto: CreateAppointmentDto, userId?: string): Promise<Appointment> {
    if (!Types.ObjectId.isValid(dto.projectId)) {
      throw new BadRequestException('Invalid projectId format');
    }

    const project = await this.projectService.findById(dto.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const appointment = new this.appointmentModel({
      projectId: new Types.ObjectId(dto.projectId),
      date: dto.date,
      type: dto.type ?? 'other',
      notes: dto.notes,
      status: AppointmentStatus.SCHEDULED,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });
    const saved = await appointment.save();

    await this.sendAppointmentSms(project.customerId?.toString(), saved, project.name, 'scheduled');
    return saved;
  }

  async findByProject(projectId: string): Promise<Appointment[]> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid projectId format');
    }

    const project = await this.projectService.findById(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.appointmentModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .sort({ date: 1 })
      .lean()
      .exec();
  }

  async findById(id: string): Promise<Appointment | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid appointment ID format');
    }
    return this.appointmentModel.findById(id).lean().exec();
  }

  async update(id: string, dto: UpdateAppointmentDto): Promise<Appointment | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid appointment ID format');
    }

    const existing = await this.appointmentModel.findById(id).exec();
    if (!existing) {
      throw new NotFoundException('Appointment not found');
    }

    const updateDoc: Record<string, unknown> = {};
    if (dto.date !== undefined) updateDoc.date = dto.date;
    if (dto.type !== undefined) updateDoc.type = dto.type;
    if (dto.notes !== undefined) updateDoc.notes = dto.notes;
    if (dto.status !== undefined) updateDoc.status = dto.status;

    const updated = await this.appointmentModel
      .findByIdAndUpdate(id, updateDoc, { new: true })
      .lean()
      .exec();

    if (updated && dto.status === AppointmentStatus.CONFIRMED) {
      const project = await this.projectService.findById(existing.projectId.toString());
      if (project) {
        await this.sendAppointmentSms(
          project.customerId?.toString(),
          updated as Appointment,
          project.name,
          'confirmed',
        );
      }
    }

    return updated;
  }

  async confirm(id: string): Promise<Appointment | null> {
    return this.update(id, { status: AppointmentStatus.CONFIRMED });
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid appointment ID format');
    }
    const deleted = await this.appointmentModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException('Appointment not found');
    }
  }

  private async sendAppointmentSms(
    customerId: string | undefined,
    appointment: Appointment,
    projectName: string,
    event: 'scheduled' | 'confirmed',
  ): Promise<void> {
    if (!customerId) return;

    const customer = await this.customerService.findOne(customerId);
    const phone = customer?.phone?.trim();
    if (!phone) return;

    const dateStr = appointment.date instanceof Date
      ? appointment.date.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
      : new Date(appointment.date).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });

    const msg =
      event === 'scheduled'
        ? `BA Kitchen & Bath: Your appointment for ${projectName} is scheduled for ${dateStr}. Reply to confirm.`
        : `BA Kitchen & Bath: Your appointment for ${projectName} on ${dateStr} is confirmed.`;

    await this.smsService.send(phone, msg);
  }
}
