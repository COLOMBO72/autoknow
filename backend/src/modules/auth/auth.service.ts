import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 час

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  private signToken(userId: string): string {
    const secret: string = this.config.getOrThrow('JWT_SECRET');
    return jwt.sign({ sub: userId }, secret, { expiresIn: '30d' });
  }

  verifyToken(token: string): string {
    try {
      const secret: string = this.config.getOrThrow('JWT_SECRET');
      const payload = jwt.verify(token, secret) as { sub: string };
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Токен недействителен или истёк');
    }
  }

  /**
   * Если передан existingUserId (анонимный гость) — прикрепляем email/пароль
   * к ЕГО аккаунту, чтобы не потерять баланс и историю. Если нет —
   * создаём нового пользователя с нуля.
   */
  async register(email: string, password: string, existingUserId?: string) {
    const taken = await this.prisma.user.findUnique({ where: { email } });
    if (taken) throw new BadRequestException('Этот email уже зарегистрирован');
    if (password.length < 8) throw new BadRequestException('Пароль должен быть не короче 8 символов');

    const passwordHash = await bcrypt.hash(password, 10);

    const user = existingUserId
      ? await this.prisma.user.update({ where: { id: existingUserId }, data: { email, passwordHash } })
      : await this.prisma.user.create({ data: { email, passwordHash } });

    return { userId: user.id, token: this.signToken(user.id) };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Неверный email или пароль');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Неверный email или пароль');
    return { userId: user.id, token: this.signToken(user.id) };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Намеренно не сообщаем, существует ли email — не подсказываем это извне.
    if (!user) return { ok: true };

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    });

    const resetUrl = `${this.config.get('APP_URL') ?? 'http://localhost:3001'}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
    await this.email.sendPasswordReset(email, resetUrl);
    return { ok: true };
  }

  async resetPassword(email: string, rawToken: string, newPassword: string) {
    if (newPassword.length < 8) throw new BadRequestException('Пароль должен быть не короче 8 символов');
    const user = await this.prisma.user.findUnique({ where: { email } });
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    if (!user || user.passwordResetTokenHash !== tokenHash || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('Ссылка недействительна или истекла — запроси новую');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetTokenHash: null, passwordResetExpiresAt: null },
    });
    return { ok: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (newPassword.length < 8) throw new BadRequestException('Пароль должен быть не короче 8 символов');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Текущий пароль указан неверно');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { ok: true };
  }

  async changeEmail(userId: string, newEmail: string) {
    const taken = await this.prisma.user.findUnique({ where: { email: newEmail } });
    if (taken) throw new BadRequestException('Этот email уже используется другим аккаунтом');
    await this.prisma.user.update({ where: { id: userId }, data: { email: newEmail } });
    return { ok: true };
  }
}
