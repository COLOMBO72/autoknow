import { Body, Controller, Post } from '@nestjs/common';
import { YookassaService } from './yookassa.service';
import { UsersService } from '../users/users.service';

interface TopupDto {
  userId: string;
  amountKopeks: number; // сумма пакета, например 30000 = 300 руб за 10 машин
  returnPath?: string; // куда вернуть после оплаты, например /report?brand=kia&model=rio&yearFrom=2019
}

interface YookassaWebhookDto {
  event: string;
  object: {
    id: string;
    status: string;
    metadata?: { userId?: string };
    amount: { value: string; currency: string };
  };
}

@Controller('billing')
export class BillingController {
  constructor(
    private readonly yookassa: YookassaService,
    private readonly users: UsersService,
  ) {}

  @Post('topup')
  async topup(@Body() dto: TopupDto) {
    return this.yookassa.createTopupPayment(dto.userId, dto.amountKopeks, dto.returnPath);
  }

  @Post('webhook/yookassa')
  async webhook(@Body() body: YookassaWebhookDto) {
    if (!this.yookassa.verifyWebhookPayload(body)) {
      return { ok: false };
    }
    const userId = body.object.metadata?.userId;
    if (!userId) {
      return { ok: false, reason: 'no userId in metadata' };
    }
    const amountKopeks = Math.round(parseFloat(body.object.amount.value) * 100);
    await this.users.credit(userId, amountKopeks, 'yookassa', body.object.id);
    return { ok: true };
  }
}
