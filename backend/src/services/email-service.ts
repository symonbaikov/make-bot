import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpSecure = process.env.SMTP_SECURE === 'true';

    // If SMTP is not configured, use console transport for development
    if (!smtpHost || !smtpUser || !smtpPassword) {
      logger.warn('SMTP not configured, using console transport for email');
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@make-bot.com';

    try {
      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
        messageId: info.messageId,
      });
    } catch (error) {
      logger.error('Failed to send email', {
        to: options.to,
        subject: options.subject,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    const subject = 'Код для входу в адмін-панель';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .code { font-size: 32px; font-weight: bold; text-align: center; padding: 20px; background: #f4f4f4; border-radius: 5px; margin: 20px 0; letter-spacing: 5px; }
            .warning { color: #666; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Код для входу в адмін-панель</h2>
            <p>Ви запросили код для входу в адмін-панель. Використовуйте наступний код:</p>
            <div class="code">${code}</div>
            <p class="warning">Цей код дійсний протягом 15 хвилин. Якщо ви не запитували цей код, проігноруйте це повідомлення.</p>
          </div>
        </body>
      </html>
    `;
    const text = `Код для входу в адмін-панель: ${code}\n\nЦей код дійсний протягом 15 хвилин. Якщо ви не запитували цей код, проігноруйте це повідомлення.`;

    await this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }
}

export const emailService = new EmailService();




