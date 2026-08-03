import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';

interface RegisterDto {
  email: string;
  password: string;
  consentGiven: boolean;
  existingUserId?: string; // id анонимного гостя, чтобы прикрепить аккаунт к нему
}
interface LoginDto {
  email: string;
  password: string;
}
interface ForgotPasswordDto {
  email: string;
}
interface ResetPasswordDto {
  email: string;
  token: string;
  newPassword: string;
}
interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
interface ChangeEmailDto {
  newEmail: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password, dto.consentGiven, dto.existingUserId);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.email, dto.token, dto.newPassword);
  }

  @UseGuards(AuthGuard)
  @Post('change-password')
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(req.userId, dto.currentPassword, dto.newPassword);
  }

  @UseGuards(AuthGuard)
  @Post('change-email')
  changeEmail(@Req() req: any, @Body() dto: ChangeEmailDto) {
    return this.auth.changeEmail(req.userId, dto.newEmail);
  }
}
