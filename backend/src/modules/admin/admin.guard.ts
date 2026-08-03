import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    if (!header?.startsWith('Bearer ')) throw new ForbiddenException('Нужен вход в аккаунт администратора');

    const userId = this.auth.verifyToken(header.slice('Bearer '.length));
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const adminEmail = this.config.get('ADMIN_EMAIL');

    if (!user?.email || user.email !== adminEmail) {
      throw new ForbiddenException('Доступ только для администратора');
    }
    return true;
  }
}
