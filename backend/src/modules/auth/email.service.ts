import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Реальная отправка через SMTP — любой провайдер подойдёт, не привязано
 * к конкретному сервису. Для РФ удобные варианты: Yandex 360 для своего
 * домена, Mail.ru для бизнеса, либо SMTP от хостинга, где будет сайт.
 *
 * Если SMTP_* не заполнены в .env — тихо откатывается на прежнее поведение
 * (просто пишет ссылку в лог), чтобы не ронять приложение на старте, если
 * почту ещё не настроили. Это видно в логе явным предупреждением.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get('SMTP_HOST');
    const port = this.config.get('SMTP_PORT');
    const user = this.config.get('SMTP_USER');
    const pass = this.config.get('SMTP_PASSWORD');

    if (host && port && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: Number(port) === 465,
        auth: { user, pass },
      });
    }
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `[SMTP НЕ НАСТРОЕН] Письмо для ${email} не отправлено. Ссылка для сброса пароля: ${resetUrl}`,
      );
      return;
    }

    const from = this.config.get('SMTP_FROM') ?? this.config.get('SMTP_USER');

    try {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: 'Восстановление пароля — autoknow',
        text: `Чтобы сбросить пароль, перейдите по ссылке: ${resetUrl}\n\nСсылка действует 1 час. Если это были не вы — просто проигнорируйте письмо.`,
        html: `<p>Чтобы сбросить пароль, перейдите по ссылке:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Ссылка действует 1 час. Если это были не вы — просто проигнорируйте письмо.</p>`,
      });
    } catch (err) {
      // Не роняем запрос пользователя из-за проблем с почтой — просто громко
      // логируем, чтобы это было видно в мониторинге.
      this.logger.error(`Не удалось отправить письмо на ${email}: ${(err as Error).message}`);
    }
  }
}
