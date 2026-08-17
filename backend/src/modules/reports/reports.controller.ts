import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";
import { ReportsService, CarVariantInput } from "./reports.service";
import { UsersService } from "../users/users.service";
import { redactReport } from "./car-report-redaction";

interface PurchaseReportDto {
  userId: string;
  car: CarVariantInput;
}

interface PreviewReportDto {
  userId?: string; // может не быть — гость ещё не создал анонимный аккаунт
  car: CarVariantInput;
}

interface CompareDto {
  userId: string;
  cars: CarVariantInput[];
}

@Controller("reports")
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Бесплатный просмотр — характеристики видны сразу, болячки/расходы/цена
   * урезаны до тизера. НЕ требует баланса и НЕ списывает деньги, но при
   * промахе кэша всё равно реально генерирует отчёт через ИИ (осознанное
   * решение — сейчас цель быстро наполнить базу трафиком, а не экономить
   * на каждом уникальном запросе). Из-за этого — лимит запросов ниже,
   * иначе кто угодно может анонимно устраивать дорогой перебор моделей.
   */
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("preview")
  async preview(@Body() dto: PreviewReportDto) {
    const carVariant = await this.reports.findOrCreateCarVariant(dto.car);
    const owned = dto.userId
      ? await this.reports.hasPurchased(dto.userId, carVariant.id)
      : false;
    const result = await this.reports.getOrGenerateReport(dto.car);

    if (owned) {
      return {
        report: result.report,
        locked: false,
        fromCache: result.fromCache,
        carVariantId: result.carVariantId,
        photoUrl: result.photoUrl,
      };
    }

    return {
      report: redactReport(result.report),
      locked: true,
      fromCache: result.fromCache,
      carVariantId: result.carVariantId,
      photoUrl: result.photoUrl,
    };
  }

  @Post("purchase")
  async purchase(@Body() dto: PurchaseReportDto) {
    const carVariant = await this.reports.findOrCreateCarVariant(dto.car);
    const alreadyPurchased = await this.reports.hasPurchased(
      dto.userId,
      carVariant.id,
    );
    const price = Number(this.config.getOrThrow("REPORT_PRICE_KOPEKS"));

    // Проверка баланса — ДО генерации, чтобы не тратить наши деньги на ИИ
    // для тех, кто всё равно не может заплатить (хотя в обычном сценарии
    // отчёт уже в кэше после бесплатного превью, и генерации тут не будет).
    if (!alreadyPurchased) {
      const canAfford = await this.users.hasSufficientBalance(
        dto.userId,
        price,
      );
      if (!canAfford) {
        throw new BadRequestException({
          code: "INSUFFICIENT_BALANCE",
          message: "Недостаточно средств на балансе",
        });
      }
    }

    // Списание — ПОСЛЕ того как отчёт реально получен. Если тут упадёт
    // ошибка (сбой ИИ, невалидный ответ и т.п.) — баланс не тронут вообще.
    const result = await this.reports.getOrGenerateReport(dto.car);

    if (!alreadyPurchased) {
      await this.users.debit(dto.userId, price, "REPORT_PURCHASE");
      await this.reports.recordPurchase(dto.userId, carVariant.id);
    }

    const totalPurchased = await this.reports.countPurchasedReports(dto.userId);

    return {
      ...result,
      alreadyOwned: alreadyPurchased,
      isFirstPurchase: !alreadyPurchased && totalPurchased === 1,
    };
  }

  @Post("compare")
  async compare(@Body() dto: CompareDto) {
    const maxCars = Number(this.config.get("COMPARISON_MAX_CARS") ?? 5);
    if (dto.cars.length < 2 || dto.cars.length > maxCars) {
      throw new BadRequestException(
        `Сравнение доступно от 2 до ${maxCars} машин`,
      );
    }

    // Для сравнения должны быть куплены (или куплены сейчас) ВСЕ машины —
    // это осознанное продуктовое решение из обсуждения монетизации.
    const results = [];
    for (const car of dto.cars) {
      results.push(await this.purchase({ userId: dto.userId, car }));
    }

    await this.reports.saveComparison(
      dto.userId,
      results.map((r) => r.carVariantId),
    );
    return { comparisons: results };
  }
}
