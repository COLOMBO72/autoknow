import { BadRequestException, Injectable } from "@nestjs/common";
import { TransactionType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateByTelegramId(telegramId: string) {
    return this.prisma.user.upsert({
      where: { telegramId },
      update: {},
      create: { telegramId },
    });
  }

  /**
   * MVP-заглушка идентификации для сайта (не для бота — там telegramId).
   * Фронт при первом визите создаёт анонимного пользователя, сохраняет
   * id в cookie и дальше всегда передаёт его. ЧЕСТНО: это не настоящая
   * авторизация — если человек почистит cookie, он потеряет доступ к
   * своему балансу/истории. Перед реальным запуском стоит заменить на
   * вход по телефону/почте, но для теста движка этого достаточно.
   */
  async createAnonymous() {
    return this.prisma.user.create({ data: {} });
  }

  async findById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async getPurchasedReports(userId: string) {
    return this.prisma.purchasedReport.findMany({
      where: { userId },
      include: { carVariant: true },
      orderBy: { purchasedAt: "desc" },
    });
  }

  async getComparisons(userId: string) {
    return this.prisma.comparison.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Атомарно списывает сумму, если хватает баланса. Бросает ошибку, если нет. */
  async debit(userId: string, amountKopeks: number, type: TransactionType) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.balanceKopeks < amountKopeks) {
        throw new BadRequestException({
          code: "INSUFFICIENT_BALANCE",
          message: "Недостаточно средств на балансе",
        });
      }
      await tx.user.update({
        where: { id: userId },
        data: { balanceKopeks: { decrement: amountKopeks } },
      });
      return tx.transaction.create({
        data: { userId, amountKopeks, type },
      });
    });
  }

  async credit(
    userId: string,
    amountKopeks: number,
    provider: string,
    externalId: string,
  ) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.update({
        where: { id: userId },
        data: { balanceKopeks: { increment: amountKopeks } },
      });
      return tx.transaction.create({
        data: { userId, amountKopeks, type: "TOPUP", provider, externalId },
      });
    });
  }
}
