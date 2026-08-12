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

  // БАГ, который поймали: без нормализации "Name@Gmail.com" и "name@gmail.com"
  // считаются разными строками при поиске в БД — регистрация проходит,
  // а вход с фактически тем же email не находит пользователя вообще
  // (ошибка "неверный пароль" при этом сбивает с толку, хотя пароль
  // до сравнения даже не доходит). Теперь email нормализуется ВЕЗДЕ,
  // на любом входе в систему, единообразно.
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

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
  async register(rawEmail: string, password: string, consentGiven: boolean, existingUserId?: string) {
    const email = this.normalizeEmail(rawEmail);
    if (!consentGiven) {
      throw new BadRequestException('Нужно согласиться с офертой и политикой обработки персональных данных');
    }
    const taken = await this.prisma.user.findUnique({ where: { email } });
    if (taken) throw new BadRequestException('Этот email уже зарегистрирован');
    if (password.length < 8) throw new BadRequestException('Пароль должен быть не короче 8 символов');

    const passwordHash = await bcrypt.hash(password, 10);
    const data = { email, passwordHash, consentGivenAt: new Date() };

    // Прикрепляем к существующему id из cookie только если это ещё
    // настоящий гость (без пароля). Если в браузере уже есть аккаунт с
    // паролем (человек уже зарегистрирован) — новая регистрация создаёт
    // ОТДЕЛЬНЫЙ аккаунт, а не переименовывает существующий. Без этой
    // проверки повторная регистрация в том же браузере тихо стирала бы
    // email предыдущего аккаунта, и вход под ним переставал бы работать.
    let user = null;
    if (existingUserId) {
      const existing = await this.prisma.user.findUnique({ where: { id: existingUserId } });
      if (existing && !existing.passwordHash) {
        user = await this.prisma.user.update({ where: { id: existingUserId }, data });
      }
    }
    if (!user) {
      user = await this.prisma.user.create({ data });
    }

    return { userId: user.id, token: this.signToken(user.id) };
  }

  async login(rawEmail: string, password: string) {
    const email = this.normalizeEmail(rawEmail);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Неверный email или пароль');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Неверный email или пароль');
    return { userId: user.id, token: this.signToken(user.id) };
  }

  async requestPasswordReset(rawEmail: string) {
    const email = this.normalizeEmail(rawEmail);
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

  async resetPassword(rawEmail: string, rawToken: string, newPassword: string) {
    const email = this.normalizeEmail(rawEmail);
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

  async changeEmail(userId: string, rawNewEmail: string) {
    const newEmail = this.normalizeEmail(rawNewEmail);
    const taken = await this.prisma.user.findUnique({ where: { email: newEmail } });
    if (taken) throw new BadRequestException('Этот email уже используется другим аккаунтом');
    await this.prisma.user.update({ where: { id: userId }, data: { email: newEmail } });
    return { ok: true };
  }
}
