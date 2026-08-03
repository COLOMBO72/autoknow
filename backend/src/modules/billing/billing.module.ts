import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { YookassaService } from './yookassa.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [BillingController],
  providers: [YookassaService],
})
export class BillingModule {}
