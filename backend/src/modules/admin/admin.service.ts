import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AiCallLog, Prisma, ReportBlockType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  specsSchema,
  problemsSchema,
  costsSchema,
  insuranceSchema,
  priceSchema,
} from '../reports/car-report.schema';
import { calculateExpiresAt } from '../reports/report-ttl.policy';

const BLOCK_SCHEMAS: Record<ReportBlockType, { parse: (v: unknown) => unknown }> = {
  SPECS: specsSchema,
  PROBLEMS: problemsSchema,
  COSTS: costsSchema,
  INSURANCE: insuranceSchema,
  PRICE: priceSchema,
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersLast7Days,
      totalReportsPurchased,
      totalComparisons,
      uniqueCarVariantsGenerated,
      revenueAgg,
      feedbackCount,
      topBrandsRaw,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.purchasedReport.count(),
      this.prisma.comparison.count(),
      this.prisma.carVariant.count(), // каждый уникальный вариант = минимум один реальный AI-вызов
      this.prisma.transaction.aggregate({ where: { type: 'TOPUP' }, _sum: { amountKopeks: true } }),
      this.prisma.feedback.count(),
      this.prisma.carVariant.groupBy({ by: ['brand'], _count: { brand: true }, orderBy: { _count: { brand: 'desc' } }, take: 5 }),
    ]);

    // Сколько покупок обошлось без нового обращения к AI (отдано из кэша) —
    // грубая, но полезная оценка экономии.
    const servedFromCache = Math.max(0, totalReportsPurchased - uniqueCarVariantsGenerated);
    const cacheSavingsPct = totalReportsPurchased > 0 ? Math.round((servedFromCache / totalReportsPurchased) * 100) : 0;

    return {
      totalUsers,
      newUsersLast7Days,
      totalReportsPurchased,
      totalComparisons,
      uniqueCarVariantsGenerated,
      servedFromCache,
      cacheSavingsPct,
      totalRevenueKopeks: revenueAgg._sum.amountKopeks ?? 0,
      feedbackCount,
      topBrands: topBrandsRaw.map((b: { brand: string; _count: { brand: number } }) => ({ brand: b.brand, count: b._count.brand })),
    };
  }

  async getRecentPurchases(limit: number) {
    return this.prisma.purchasedReport.findMany({
      take: limit,
      orderBy: { purchasedAt: 'desc' },
      include: { carVariant: true, user: { select: { email: true, telegramId: true, id: true } } },
    });
  }

  async getAiHealth() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const logs: AiCallLog[] = await this.prisma.aiCallLog.findMany({
      where: { createdAt: { gte: oneDayAgo } },
      orderBy: { createdAt: 'desc' },
    });

    const byProvider = (provider: string) => logs.filter((l: AiCallLog) => l.provider === provider);
    const rate = (arr: AiCallLog[]) => {
      if (arr.length === 0) return null;
      return Math.round((arr.filter((l: AiCallLog) => l.success).length / arr.length) * 100);
    };

    const recentErrors = logs.filter((l: AiCallLog) => !l.success).slice(0, 20);

    return {
      windowHours: 24,
      primary: { total: byProvider('primary').length, successRatePct: rate(byProvider('primary')) },
      fallback: { total: byProvider('fallback').length, successRatePct: rate(byProvider('fallback')) },
      recentErrors: recentErrors.map((e: AiCallLog) => ({
        provider: e.provider,
        model: e.model,
        message: e.errorMessage,
        at: e.createdAt,
      })),
    };
  }

  async getFeedback(limit: number) {
    return this.prisma.feedback.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true } } },
    });
  }

  async searchCarVariants(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this.prisma.carVariant.findMany({
      where: { OR: [{ brand: { contains: q } }, { model: { contains: q } }] },
      take: 20,
      orderBy: [{ brand: 'asc' }, { model: 'asc' }],
    });
  }

  async getCarVariantBlocks(carVariantId: string) {
    const carVariant = await this.prisma.carVariant.findUnique({ where: { id: carVariantId } });
    if (!carVariant) throw new NotFoundException('Машина не найдена');
    const blocks = await this.prisma.carReportBlock.findMany({ where: { carVariantId } });
    return { carVariant, blocks };
  }

  /**
   * Ручная правка блока отчёта из тикета в поддержку. Прогоняется через ту
   * же zod-схему, что и ответы ИИ — нельзя случайно сохранить сломанный
   * JSON, структура должна совпадать 1-в-1. TTL продлевается заново и
   * помечается aiModel: 'admin-manual-edit', чтобы было видно в данных,
   * что это не сгенерировано моделью.
   */
  async updateCarVariantBlock(carVariantId: string, type: ReportBlockType, rawContent: string) {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      throw new BadRequestException('Это не валидный JSON — проверь синтаксис (скобки/запятые)');
    }

    let validated: unknown;
    try {
      validated = BLOCK_SCHEMAS[type].parse(parsedJson);
    } catch (err) {
      throw new BadRequestException(`Не проходит проверку структуры: ${(err as Error).message}`);
    }

    const now = new Date();
    return this.prisma.carReportBlock.upsert({
      where: { carVariantId_type: { carVariantId, type } },
      update: { content: validated as Prisma.InputJsonValue, generatedAt: now, expiresAt: calculateExpiresAt(type, now), aiModel: 'admin-manual-edit' },
      create: { carVariantId, type, content: validated as Prisma.InputJsonValue, expiresAt: calculateExpiresAt(type, now), aiModel: 'admin-manual-edit' },
    });
  }

  async topupByEmail(email: string, amountKopeks: number) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Пользователь с таким email не найден');

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.update({ where: { id: user.id }, data: { balanceKopeks: { increment: amountKopeks } } });
      return tx.transaction.create({
        data: { userId: user.id, amountKopeks, type: 'TOPUP', provider: 'admin-manual' },
      });
    });
  }
}
