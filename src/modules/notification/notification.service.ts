import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from './schemas/notification.schema';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import { CustomerService } from '../customer/customer.service';
import { UsersService } from '../users/users.service';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  channels?: ('email' | 'sms' | 'in_app')[];
  /** Override: email para envío directo (evita lookup) */
  email?: string;
  /** Override: teléfono para SMS directo (evita lookup) */
  phone?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
    private readonly customerService: CustomerService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Crea una notificación y la envía por los canales configurados.
   * Módulo general e independiente: cualquier feature puede llamar a create().
   */
  async create(params: CreateNotificationParams): Promise<Notification> {
    const channels = params.channels ?? ['in_app'];
    const doc = new this.notificationModel({
      userId: new Types.ObjectId(params.userId),
      type: params.type,
      read: false,
      payload: params.payload,
      channels,
    });
    const saved = await doc.save();

    const { email, phone } = await this.resolveContact(params);

    for (const ch of channels) {
      if (ch === 'email' && email) {
        this.sendEmail(params.type, params.payload, email).catch((err) =>
          this.logger.warn(`Notification email failed: ${err instanceof Error ? err.message : String(err)}`),
        );
      }
      if (ch === 'sms' && phone) {
        this.sendSms(params.type, params.payload, phone).catch((err) =>
          this.logger.warn(`Notification SMS failed: ${err instanceof Error ? err.message : String(err)}`),
        );
      }
    }

    return saved;
  }

  async findByUser(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]> {
    if (!Types.ObjectId.isValid(userId)) return [];

    const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    if (options?.unreadOnly) filter.read = false;

    let query = this.notificationModel.find(filter).sort({ createdAt: -1 });
    if (options?.limit) query = query.limit(options.limit);
    return query.lean().exec();
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId)) return null;
    return this.notificationModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { $set: { read: true } },
        { new: true },
      )
      .lean()
      .exec();
  }

  async markAllAsRead(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) return;
    await this.notificationModel.updateMany({ userId: new Types.ObjectId(userId) }, { $set: { read: true } }).exec();
  }

  private async resolveContact(params: CreateNotificationParams): Promise<{ email?: string; phone?: string }> {
    let email = params.email;
    let phone = params.phone;

    if (!email || !phone) {
      const user = await this.usersService.findById(params.userId);
      const customer = await this.customerService.findByUserId(params.userId);
      if (!email) email = user?.email;
      if (!phone) phone = customer?.phone?.trim();
    }

    return { email, phone };
  }

  private async sendEmail(type: NotificationType, payload: Record<string, unknown>, to: string): Promise<void> {
    const { subject, html } = this.getEmailTemplate(type, payload);
    await this.mailService.sendMail({ to, subject, html });
  }

  private getEmailTemplate(
    type: NotificationType,
    payload: Record<string, unknown>,
  ): { subject: string; html: string } {
    const projectName = (payload.projectName as string) ?? 'your project';
    const quoteVersion = (payload.quoteVersion as number) ?? 1;

    switch (type) {
      case NotificationType.QUOTE_SENT:
        return {
          subject: `Quote ready for ${projectName}`,
          html: `
            <p>Hello,</p>
            <p>Your quote for ${projectName} (v${quoteVersion}) is ready for review.</p>
            <p>Please log in to the app to view and approve.</p>
            <p>BA Kitchen & Bath</p>
          `,
        };
      case NotificationType.QUOTE_CHANGES_REQUESTED:
        return {
          subject: `Changes requested for ${projectName}`,
          html: `
            <p>Hello,</p>
            <p>Changes have been requested for your quote on ${projectName}. Please review in the app.</p>
            <p>BA Kitchen & Bath</p>
          `,
        };
      case NotificationType.APPOINTMENT:
      case NotificationType.APPOINTMENT_CONFIRMED:
        const dateStr = payload.date
          ? new Date(payload.date as string).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
          : 'TBD';
        return {
          subject: `Appointment ${type === NotificationType.APPOINTMENT_CONFIRMED ? 'confirmed' : 'scheduled'} for ${projectName}`,
          html: `
            <p>Hello,</p>
            <p>Your appointment for ${projectName} is ${type === NotificationType.APPOINTMENT_CONFIRMED ? 'confirmed' : 'scheduled'} for ${dateStr}.</p>
            <p>BA Kitchen & Bath</p>
          `,
        };
      case NotificationType.PAYMENT_ENABLED:
        return {
          subject: `Payment enabled for ${projectName}`,
          html: `
            <p>Hello,</p>
            <p>Payment is now enabled for ${projectName}. You can complete your payment in the app.</p>
            <p>BA Kitchen & Bath</p>
          `,
        };
      case NotificationType.PROJECT_UPDATE:
        const title = (payload.title as string) ?? 'Project update';
        return {
          subject: `${title} - ${projectName}`,
          html: `
            <p>Hello,</p>
            <p>${payload.description ?? title}</p>
            <p>BA Kitchen & Bath</p>
          `,
        };
      default:
        const msg = (payload.message as string) ?? 'You have a new notification.';
        return {
          subject: 'BA Kitchen & Bath - Notification',
          html: `<p>${msg}</p><p>BA Kitchen & Bath</p>`,
        }
    }
  }

  private async sendSms(type: NotificationType, payload: Record<string, unknown>, to: string): Promise<void> {
    const body = this.getSmsBody(type, payload);
    await this.smsService.send(to, body);
  }

  private getSmsBody(type: NotificationType, payload: Record<string, unknown>): string {
    const projectName = (payload.projectName as string) ?? 'your project';
    const prefix = 'BA Kitchen & Bath: ';

    switch (type) {
      case NotificationType.QUOTE_SENT:
        return `${prefix}Your quote for ${projectName} is ready. Log in to review.`;
      case NotificationType.QUOTE_CHANGES_REQUESTED:
        return `${prefix}Changes requested for ${projectName}. Please review in the app.`;
      case NotificationType.APPOINTMENT:
      case NotificationType.APPOINTMENT_CONFIRMED:
        const dateStr = payload.date
          ? new Date(payload.date as string).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
          : 'TBD';
        return `${prefix}Appointment for ${projectName} ${type === NotificationType.APPOINTMENT_CONFIRMED ? 'confirmed' : 'scheduled'} for ${dateStr}.`;
      case NotificationType.PAYMENT_ENABLED:
        return `${prefix}Payment enabled for ${projectName}. Complete payment in the app.`;
      case NotificationType.PROJECT_UPDATE:
        return `${prefix}${(payload.title as string) ?? 'Project update'} for ${projectName}. Check the app.`;
      default:
        return `${prefix}${(payload.message as string) ?? 'You have a new notification.'}`;
    }
  }
}
