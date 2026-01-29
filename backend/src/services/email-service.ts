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

  /**
   * Send custom email to user from admin panel
   */
  async sendEmailToUser(email: string, subject: string, body: string): Promise<void> {
    // Convert plain text body to HTML, preserving line breaks
    const html = body
      .split('\n')
      .map(line => `<p>${line || '&nbsp;'}</p>`)
      .join('');

    await this.sendEmail({
      to: email,
      subject,
      html,
      text: body,
    });
  }

  /**
   * Send notification to admin about new user registration
   */
  async sendNewUserNotification(data: {
    sessionId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    plan: string;
    amount: number;
  }): Promise<void> {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (!adminEmail) {
      logger.warn('ADMIN_NOTIFICATION_EMAIL not configured, skipping admin notification');
      return;
    }

    const fullName =
      data.firstName || data.lastName
        ? `${data.firstName || ''} ${data.lastName || ''}`.trim()
        : 'Не вказано';

    const subject = 'Новий користувач зареєстрований';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
            .info-row { margin: 10px 0; padding: 10px; background: white; border-radius: 5px; }
            .label { font-weight: bold; color: #6B7280; }
            .value { color: #111827; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Новий користувач зареєстрований</h2>
            </div>
            <div class="content">
              <div class="info-row">
                <div class="label">ID сесії:</div>
                <div class="value">${data.sessionId}</div>
              </div>
              <div class="info-row">
                <div class="label">Email:</div>
                <div class="value">${data.email}</div>
              </div>
              <div class="info-row">
                <div class="label">Ім'я та прізвище:</div>
                <div class="value">${fullName}</div>
              </div>
              ${
                data.phoneNumber
                  ? `
              <div class="info-row">
                <div class="label">Телефон:</div>
                <div class="value">${data.phoneNumber}</div>
              </div>
              `
                  : ''
              }
              <div class="info-row">
                <div class="label">План:</div>
                <div class="value">${data.plan}</div>
              </div>
              <div class="info-row">
                <div class="label">Сума:</div>
                <div class="value">$${data.amount}</div>
              </div>
              <p style="margin-top: 20px; color: #6B7280; font-size: 14px;">
                Переглянути деталі в адмін-панелі: <a href="${process.env.ADMIN_PANEL_URL || 'https://make-botbackend-production.up.railway.app'}/payments/${data.sessionId}" style="color: #4F46E5;">Відкрити</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
    const text = `Новий користувач зареєстрований\n\nID сесії: ${data.sessionId}\nEmail: ${data.email}\nІм'я та прізвище: ${fullName}\n${data.phoneNumber ? `Телефон: ${data.phoneNumber}\n` : ''}План: ${data.plan}\nСума: $${data.amount}`;

    try {
      await this.sendEmail({
        to: adminEmail,
        subject,
        html,
        text,
      });
      logger.info('Admin notification sent successfully', {
        sessionId: data.sessionId,
        adminEmail,
      });
    } catch (error) {
      logger.error('Failed to send admin notification', {
        sessionId: data.sessionId,
        adminEmail,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw error - notification failure shouldn't break the main flow
    }
  }

  /**
   * Send notification that password was changed
   */
  async sendPasswordChangedNotification(email: string): Promise<void> {
    const subject = 'Ваш пароль було змінено';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
            .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Пароль змінено</h2>
            </div>
            <div class="content">
              <p>Ваш пароль було успішно змінено.</p>
              <p>Дата зміни: ${new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' })}</p>
              <div class="warning">
                <strong>⚠️ Важливо!</strong><br>
                Якщо ви не змінювали пароль, негайно зв'яжіться з адміністратором.
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
    const text = `Пароль змінено\n\nВаш пароль було успішно змінено.\nДата зміни: ${new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' })}\n\nЯкщо ви не змінювали пароль, негайно зв'яжіться з адміністратором.`;

    await this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }
}

export const emailService = new EmailService();
