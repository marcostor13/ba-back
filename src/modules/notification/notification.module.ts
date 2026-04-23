import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { MailModule } from '../mail/mail.module';
import { SmsModule } from '../sms/sms.module';
import { CustomerModule } from '../customer/customer.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
    MailModule,
    SmsModule,
    CustomerModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
