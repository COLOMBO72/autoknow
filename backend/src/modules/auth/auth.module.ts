import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { EmailService } from './email.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, EmailService],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
