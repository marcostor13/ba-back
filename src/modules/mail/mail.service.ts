import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface SendMailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

interface CustomerWelcomeParams {
  to: string;
  name?: string;
  tempPassword: string;
}

interface PasswordResetParams {
  to: string;
  name?: string;
  code: string;
  expiresInMinutes: number;
}

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly defaultFrom: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    const host = this.getRequiredEnv('SMTP_HOST');
    const port = Number(this.getRequiredEnv('SMTP_PORT'));
    const secure =
      (this.configService.get<string>('SMTP_SECURE') || 'false').toLowerCase() === 'true';
    const user = this.getRequiredEnv('SMTP_USER');
    const pass = this.getRequiredEnv('SMTP_PASS');
    this.defaultFrom = this.configService.get<string>('SMTP_FROM') || `BA <${user}>`;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  private getRequiredEnv(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Missing environment variable: ${key}`);
    }
    return value.trim();
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    const mailOptions = {
      from: options.from || this.defaultFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error.stack);
      throw error;
    }
  }

  async sendCustomerWelcomeCredentials(params: CustomerWelcomeParams): Promise<void> {
    const { to, name, tempPassword } = params;
    const subject = 'Bienvenido a BA - Credenciales temporales';
    const greeting = name ? `Hola ${name},` : 'Hola,';
    const html = `
      <p>${greeting}</p>
      <p>Se ha creado una cuenta para ti en BA. Usa la siguiente contraseña temporal para iniciar sesión:</p>
      <p><strong>${tempPassword}</strong></p>
      <p>Por seguridad, te recomendamos cambiarla al ingresar.</p>
      <p>Gracias,</p>
      <p>Equipo BA</p>
    `;

    await this.sendMail({ to, subject, html });
  }

  async sendPasswordResetCode(params: PasswordResetParams): Promise<void> {
    const { to, name, code, expiresInMinutes } = params;
    const subject = 'Código de verificación para restablecer tu contraseña';
    const greeting = name ? `Hola ${name},` : 'Hola,';
    const html = `
      <p>${greeting}</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente código:</p>
      <h2>${code}</h2>
      <p>Este código expirará en ${expiresInMinutes} minutos.</p>
      <p>Si no solicitaste este cambio, ignora este correo.</p>
      <p>Equipo BA</p>
    `;

    await this.sendMail({ to, subject, html });
  }
}

