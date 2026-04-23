import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from './schemas/appointment.schema';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { ProjectModule } from '../project/project.module';
import { SmsModule } from '../sms/sms.module';
import { CustomerModule } from '../customer/customer.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }]),
    ProjectModule,
    SmsModule,
    CustomerModule,
    AuthModule,
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService],
  exports: [AppointmentService],
})
export class AppointmentModule {}
