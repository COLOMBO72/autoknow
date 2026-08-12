import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

export interface CreatePaymentResult {
  confirmationUrl: string;
  paymentId: string;
}

@Injectable()
export class YookassaService {
  constructor(private readonly config: ConfigService) {}

  private authHeader(): string {
    const shopId = this.config.getOrThrow('YOOKASSA_SHOP_ID');
    const secretKey = this.config.getOrThrow('YOOKASSA_SECRET_KEY');
    return 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
  }

  /**
   * Создаёт платёж на пополнение баланса. amountKopeks -> рубли с копейками
   * для ЮKassa (у них сумма строкой "300.00", не в копейках).
   */
  async createTopupPayment(userId: string, amountKopeks: number, returnPath?: string): Promise<CreatePaymentResult> {
    const amountRub = (amountKopeks / 100).toFixed(2);
    const path = returnPath && returnPath.startsWith('/') ? returnPath : '/billing/success';

    const response = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.authHeader(),
        'Idempotence-Key': randomUUID(),
      },
      body: JSON.stringify({
        amount: { value: amountRub, currency: 'RUB' },
        confirmation: {
          type: 'redirect',
          return_url: `${this.config.get('APP_URL') ?? ''}${path}`,
        },
        capture: true,
        description: `Пополнение баланса autoknow, userId=${userId}`,
        metadata: { userId },
      }),
    });

    if (!response.ok) {
      throw new Error(`YooKassa вернула ошибку: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as {
      id: string;
      confirmation: { confirmation_url: string };
    };

    return { confirmationUrl: data.confirmation.confirmation_url, paymentId: data.id };
  }

  /** Проверка webhook — в проде обязательно сверять IP отправителя со списком ЮKassa. */
  verifyWebhookPayload(body: { event: string; object: { id: string; status: string; metadata?: { userId?: string }; amount: { value: string } } }) {
    return body.event === 'payment.succeeded' && body.object.status === 'succeeded';
  }
}
