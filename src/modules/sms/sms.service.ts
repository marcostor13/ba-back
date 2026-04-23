import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly client: import('twilio').Twilio | null = null;
  private readonly fromNumber: string | null = null;

  constructor(private readonly config: ConfigService) {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.config.get<string>('TWILIO_PHONE_NUMBER') ?? null;

    if (accountSid && authToken) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const twilio = require('twilio');
        this.client = twilio(accountSid, authToken);
      } catch {
        this.logger.warn('Twilio package not installed or failed to load');
      }
    } else {
      this.logger.warn('Twilio not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)');
    }
  }

  async send(to: string, body: string): Promise<boolean> {
    if (!this.client || !this.fromNumber) {
      this.logger.debug(`SMS (skipped - not configured): to=${to} body=${body.substring(0, 50)}...`);
      return false;
    }

    const normalizedTo = this.normalizePhone(to);
    if (!normalizedTo) {
      this.logger.warn(`Invalid phone number for SMS: ${to}`);
      return false;
    }

    try {
      await this.client.messages.create({
        body,
        from: this.fromNumber,
        to: normalizedTo,
      });
      this.logger.log(`SMS sent to ${normalizedTo}`);
      return true;
    } catch (err) {
      this.logger.error(`SMS failed to ${normalizedTo}: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  private normalizePhone(phone: string): string | null {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) return `+1${cleaned}`;
    if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
    if (cleaned.length >= 10) return `+${cleaned}`;
    return null;
  }
}
