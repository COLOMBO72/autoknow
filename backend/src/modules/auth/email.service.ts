import { Injectable, Logger } from '@nestjs/common';

/**
 * ЗАГЛУШКА. Реальная отправка почты требует SMTP/транзакционного сервиса
 * (например, Яндекс 360, Mail.ru для бизнеса, или зарубежный типа Postmark —
 * с учётом тех же ограничений доступа из РФ, что обсуждали для других
 * западных сервисов). Пока просто печатает ссылку в лог — на деле разработки
 * можно скопировать её оттуда руками. Перед реальным запуском — заменить
 * тело sendPasswordReset на настоящий вызов почтового провайдера.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    this.logger.warn(
      `[ЗАГЛУШКА ПОЧТЫ] Письмо для ${email} не отправлено по-настоящему. Ссылка для сброса пароля: ${resetUrl}`,
    );
  }
}
