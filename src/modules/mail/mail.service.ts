import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface MailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

interface SendMailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  attachments?: MailAttachment[];
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

interface RegistrationVerificationParams {
  to: string;
  name: string;
  code: string;
  expiresInMinutes: number;
}

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly defaultFrom: string;
  private readonly logger = new Logger(MailService.name);
  private readonly isGmail: boolean;

  constructor(private readonly configService: ConfigService) {
    const host = this.getRequiredEnv('SMTP_HOST');
    const port = Number(this.getRequiredEnv('SMTP_PORT'));
    const secure =
      (this.configService.get<string>('SMTP_SECURE') || 'false').toLowerCase() === 'true';
    const user = this.getRequiredEnv('SMTP_USER');
    const pass = this.getRequiredEnv('SMTP_PASS');
    this.defaultFrom = this.configService.get<string>('SMTP_FROM') || `BA <${user}>`;

    // Log de configuración (sin mostrar contraseña completa)
    this.logger.log(`SMTP Config - Host: ${host}, Port: ${port}, Secure: ${secure}, User: ${user}, Pass: ${pass ? `${pass.substring(0, 3)}...` : 'NOT SET'}`);

    // Detectar si es Gmail
    this.isGmail = host.includes('gmail.com') || host.includes('google');

    // Configurar transporter según el proveedor
    if (this.isGmail) {
      // Para Gmail, usar la configuración de servicio (nodemailer maneja host/port automáticamente)
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
      });
    } else {
      // Para otros proveedores SMTP, usar configuración manual
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

    // Validar conexión al inicializar (solo en desarrollo)
    if (process.env.NODE_ENV !== 'production') {
      this.validateConnection().catch((error) => {
        this.logger.warn(
          `No se pudo validar la conexión SMTP al inicializar: ${error.message}`
        );
      });
    }
  }

  private getRequiredEnv(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      this.logger.error(`Missing environment variable: ${key}`);
      throw new Error(`Missing environment variable: ${key}`);
    }
    // Limpiar el valor: eliminar espacios, saltos de línea y caracteres de control
    const cleaned = value.trim().replace(/\s+$/g, '').replace(/[\r\n]/g, '');
    if (!cleaned) {
      this.logger.error(`Environment variable ${key} is empty after cleaning`);
      throw new Error(`Environment variable ${key} is empty`);
    }
    return cleaned;
  }

  /**
   * Valida la conexión SMTP verificando las credenciales
   */
  private async validateConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('Conexión SMTP validada correctamente');
    } catch (error: any) {
      const errorMessage = this.formatSmtpError(error);
      this.logger.error(`Error al validar conexión SMTP: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  /**
   * Formatea los errores de SMTP con mensajes más claros y útiles
   */
  private formatSmtpError(error: any): string {
    if (!error) {
      return 'Error desconocido en el servicio de correo';
    }

    // Error de autenticación
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      let message = 'Error de autenticación SMTP. ';

      if (this.isGmail) {
        message += '\n\nPara Gmail, necesitas usar una "Contraseña de aplicación" en lugar de tu contraseña normal.';
        message += '\nPasos para generar una contraseña de aplicación:';
        message += '\n1. Ve a tu cuenta de Google: https://myaccount.google.com/';
        message += '\n2. Activa la verificación en 2 pasos si no está activada';
        message += '\n3. Ve a "Seguridad" > "Contraseñas de aplicaciones"';
        message += '\n4. Genera una nueva contraseña de aplicación para "Correo"';
        message += '\n5. Usa esa contraseña de 16 caracteres en la variable SMTP_PASS';
        message += '\n\nSi ya usas una contraseña de aplicación, verifica que:';
        message += '\n- SMTP_USER sea tu email completo (ej: tuemail@gmail.com)';
        message += '\n- SMTP_PASS sea la contraseña de aplicación (16 caracteres sin espacios)';
        message += '\n- SMTP_HOST sea "smtp.gmail.com"';
        message += '\n- SMTP_PORT sea 587';
        message += '\n- SMTP_SECURE sea "false"';
      } else {
        message += '\nVerifica que las credenciales SMTP_USER y SMTP_PASS sean correctas.';
      }

      return message;
    }

    // Error de conexión
    if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      return `Error de conexión SMTP: No se pudo conectar al servidor. Verifica SMTP_HOST y SMTP_PORT.`;
    }

    // Error genérico
    const response = error.response || error.message || 'Error desconocido';
    return `Error SMTP: ${response}`;
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    const mailOptions: nodemailer.SendMailOptions = {
      from: options.from || this.defaultFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    };

    // Log de los parámetros del correo antes de enviarlo (sin contenido sensible completo)
    this.logger.log(
      `Preparando envío de email - From: ${mailOptions.from}, To: ${mailOptions.to}, Subject: ${mailOptions.subject}, ` +
        `HasHTML: ${Boolean(mailOptions.html)}, HasText: ${Boolean(mailOptions.text)}, Attachments: ${
          mailOptions.attachments?.length ?? 0
        }`,
    );

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email enviado exitosamente a ${options.to}`);
    } catch (error: any) {
      const errorMessage = this.formatSmtpError(error);
      this.logger.error(`Failed to send email to ${options.to}`);
      this.logger.error(errorMessage);

      // Lanzar error con mensaje formateado
      const formattedError = new Error(errorMessage);
      formattedError.stack = error.stack;
      throw formattedError;
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

  async sendRegistrationVerificationCode(params: RegistrationVerificationParams): Promise<void> {
    const { to, name, code, expiresInMinutes } = params;
    const subject = 'Verification code to complete your registration';
    const html = `
      <p>Hello ${name},</p>
      <p>Thank you for registering with BA. To complete your registration, please use the following verification code:</p>
      <h2 style="font-size: 32px; letter-spacing: 8px; text-align: center; margin: 20px 0; color: #2563eb;">${code}</h2>
      <p>This code will expire in ${expiresInMinutes} minutes.</p>
      <p>If you did not request this registration, please ignore this email.</p>
      <p>Welcome,</p>
      <p>BA Team</p>
    `;

    await this.sendMail({ to, subject, html });
  }
}

