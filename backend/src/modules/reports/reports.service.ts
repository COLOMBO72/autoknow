import { Inject, Injectable, Logger } from "@nestjs/common";
import { ReportBlockType, CarReportBlock, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AI_PROVIDER, AiProvider } from "../ai/ai-provider.interface";
import { CarContextProvider } from "./car-context.provider";
import { buildCarReportPrompt } from "./car-report.prompt";
import { carReportSchema, CarReport } from "./car-report.schema";
import { calculateExpiresAt } from "./report-ttl.policy";
import { CatalogService } from "../catalog/catalog.service";

export interface CarVariantInput {
  brand: string;
  model: string;
  generation?: string;
  yearFrom: number;
  yearTo?: number;
  engine?: string;
  bodyType?: string;
}

export interface ReportResult {
  report: CarReport;
  fromCache: boolean;
  carVariantId: string;
  photoUrl: string | null;
}

const ALL_BLOCK_TYPES = Object.values(ReportBlockType);

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly inFlightGenerations = new Map<string, Promise<CarReport>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly contextProvider: CarContextProvider,
    private readonly catalog: CatalogService,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
  ) {}

  /** Находит существующий CarVariant по нормализованным полям либо создаёт новый. */
  async findOrCreateCarVariant(input: CarVariantInput) {
    const normalized = this.normalize(input);
    try {
      return await this.prisma.carVariant.upsert({
        where: {
          brand_model_generation_yearFrom_yearTo_engine_bodyType: normalized,
        },
        update: {},
        create: normalized,
      });
    } catch (err) {
      // Гонка: кто-то создал точно такую же запись на долю секунды раньше
      // (в dev-режиме — двойной вызов эффекта React StrictMode, в проде —
      // просто два реальных запроса почти одновременно). Не ошибка бизнес-
      // логики — забираем уже созданную запись вместо падения.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return this.prisma.carVariant.findUniqueOrThrow({
          where: {
            brand_model_generation_yearFrom_yearTo_engine_bodyType: normalized,
          },
        });
      }
      throw err;
    }
  }

  // Строгий выбор из списков на фронте (не свободный текст) — значения уже
  // приходят каноничными, поэтому просто подчищаем пробелы/регистр на всякий
  // случай, а не резолвим синонимы.
  //
  // ВАЖНО: Prisma не умеет искать по составному @@unique-ключу, если в нём
  // участвует null — генерируемый тип для such where требует именно string/
  // number, без null (это её собственное ограничение, не наша прихоть).
  // Поэтому "не указано" храним не как null, а как '' / 0 — единообразно
  // и в where, и в create, иначе повторный запрос не найдёт уже созданную
  // запись и кэш перестанет работать.
  private normalize(input: CarVariantInput): {
    brand: string;
    model: string;
    generation: string;
    yearFrom: number;
    yearTo: number;
    engine: string;
    bodyType: string;
  } {
    return {
      brand: input.brand.trim().toLowerCase(),
      model: input.model.trim().toLowerCase(),
      generation: input.generation?.trim().toLowerCase() ?? "",
      yearFrom: input.yearFrom,
      yearTo: input.yearTo ?? 0,
      engine: input.engine?.trim().toLowerCase() ?? "",
      bodyType: input.bodyType?.trim().toLowerCase() ?? "",
    };
  }

  async hasPurchased(userId: string, carVariantId: string): Promise<boolean> {
    const existing = await this.prisma.purchasedReport.findFirst({
      where: { userId, carVariantId },
    });
    return existing !== null;
  }

  async recordPurchase(userId: string, carVariantId: string) {
    return this.prisma.purchasedReport.create({
      data: { userId, carVariantId },
    });
  }

  async countPurchasedReports(userId: string): Promise<number> {
    return this.prisma.purchasedReport.count({ where: { userId } });
  }

  async saveComparison(userId: string, carVariantIds: string[]) {
    return this.prisma.comparison.create({ data: { userId, carVariantIds } });
  }

  async getOrGenerateReport(input: CarVariantInput): Promise<ReportResult> {
    // Диапазоны поколений применяем только к простым запросам "марка+модель+год"
    // без уточнений — если человек явно выбрал двигатель/кузов/поколение,
    // это уже достаточно специфичный запрос, обрабатываем как раньше.
    const isBasicQuery = !input.generation && !input.engine && !input.bodyType;
    let carVariant = isBasicQuery
      ? await this.findCanonicalVariant(
          input.brand,
          input.model,
          input.yearFrom,
        )
      : null;
    if (!carVariant) {
      carVariant = await this.findOrCreateCarVariant(input);
    }

    const existingBlocks = await this.prisma.carReportBlock.findMany({
      where: { carVariantId: carVariant.id },
    });

    const now = new Date();
    const hasAllFreshBlocks =
      existingBlocks.length === ALL_BLOCK_TYPES.length &&
      existingBlocks.every((b: CarReportBlock) => b.expiresAt > now);

    if (hasAllFreshBlocks) {
      this.logger.log(`Кэш-попадание для carVariant ${carVariant.id}`);
      await this.prisma.carReportBlock.updateMany({
        where: { carVariantId: carVariant.id },
        data: { hitCount: { increment: 1 } },
      });
      return {
        report: this.assembleReportFromBlocks(existingBlocks),
        fromCache: true,
        carVariantId: carVariant.id,
        photoUrl: carVariant.photoUrl,
      };
    }

    this.logger.log(
      `Кэш-промах/устарел для carVariant ${carVariant.id}, генерирую через AI`,
    );

    // Если на эту же машину уже летит другой запрос (двойной клик, повтор
    // эффекта React в dev-режиме, две вкладки) — ждём его результат вместо
    // того чтобы запускать вторую платную генерацию параллельно.
    let report: CarReport;
    const inFlight = this.inFlightGenerations.get(carVariant.id);
    if (inFlight) {
      report = await inFlight;
    } else {
      const promise = this.generateFreshReport(input);
      this.inFlightGenerations.set(carVariant.id, promise);
      try {
        report = await promise;
      } finally {
        this.inFlightGenerations.delete(carVariant.id);
      }
    }

    // Best-effort: копилка каталога не должна ронять основной запрос,
    // если тут что-то пойдёт не так — просто логируем и едем дальше.
    this.catalog.recordDiscoveredVariants(input, report.specs).catch((err) => {
      this.logger.warn(
        `Не удалось обновить каталог для ${input.brand} ${input.model}: ${(err as Error).message}`,
      );
    });

    await Promise.all(
      ALL_BLOCK_TYPES.map((type) =>
        this.prisma.carReportBlock.upsert({
          where: { carVariantId_type: { carVariantId: carVariant.id, type } },
          update: {
            content: report[this.blockTypeToKey(type)] as object,
            generatedAt: now,
            expiresAt: calculateExpiresAt(type, now),
          },
          create: {
            carVariantId: carVariant.id,
            type,
            content: report[this.blockTypeToKey(type)] as object,
            expiresAt: calculateExpiresAt(type, now),
          },
        }),
      ),
    );
    if (isBasicQuery && report.specs.generationYearFrom) {
      await this.saveGenerationRange(
        input.brand,
        input.model,
        report.specs.generationYearFrom,
        report.specs.generationYearTo ?? new Date().getFullYear(),
        carVariant.id,
      );
    }
    return {
      report,
      fromCache: false,
      carVariantId: carVariant.id,
      photoUrl: carVariant.photoUrl,
    };
  }

  private async generateFreshReport(
    input: CarVariantInput,
  ): Promise<CarReport> {
    const contextChunks = await this.contextProvider.getContextChunks(input);
    const { systemPrompt, userPrompt } = buildCarReportPrompt(
      input,
      contextChunks,
    );

    const first = await this.ai.generateStructured({
      systemPrompt,
      userPrompt,
      responseSchemaName: "CarReport",
    });

    try {
      return carReportSchema.parse(JSON.parse(first.raw));
    } catch (err) {
      // Модель сбилась с формата — редко, но случается. Даём ей одну
      // попытку исправиться, показав, в чём именно была ошибка, вместо
      // того чтобы сразу ронять запрос пользователя.
      this.logger.warn(
        `Первый ответ модели не прошёл валидацию (${(err as Error).message}), пробую повторно с уточнением`,
      );

      const repairPrompt = `${userPrompt}\n\nТвой предыдущий ответ не прошёл проверку формата: ${(err as Error).message}\nПредыдущий ответ был:\n${first.raw}\n\nИсправь и верни СТРОГО валидный JSON по той же структуре, без пояснений.`;

      const second = await this.ai.generateStructured({
        systemPrompt,
        userPrompt: repairPrompt,
        responseSchemaName: "CarReport",
        useWebSearch: false,
      });
      return carReportSchema.parse(JSON.parse(second.raw));
    }
  }

  private blockTypeToKey(type: ReportBlockType): keyof CarReport {
    const map: Record<ReportBlockType, keyof CarReport> = {
      SPECS: "specs",
      PROBLEMS: "problems",
      COSTS: "costs",
      INSURANCE: "insurance",
      PRICE: "price",
      CHECKLIST: "checklistBeforeBuying",
    };
    return map[type];
  }

  /** Ищем, не попадает ли год в уже известный диапазон поколения — если да, используем ту же машину, что и раньше, вместо новой генерации. */
  private async findCanonicalVariant(
    brand: string,
    model: string,
    year: number,
  ) {
    const range = await this.prisma.carGenerationRange.findFirst({
      where: {
        brand: brand.trim().toLowerCase(),
        model: model.trim().toLowerCase(),
        yearFrom: { lte: year },
        yearTo: { gte: year },
      },
    });
    if (!range) return null;
    return this.prisma.carVariant.findUnique({
      where: { id: range.canonicalCarVariantId },
    });
  }

  /** Best-effort — не должно ронять основной запрос, если не получилось сохранить. */
  private async saveGenerationRange(
    brand: string,
    model: string,
    yearFrom: number,
    yearTo: number,
    carVariantId: string,
  ) {
    try {
      await this.prisma.carGenerationRange.create({
        data: {
          brand: brand.trim().toLowerCase(),
          model: model.trim().toLowerCase(),
          yearFrom,
          yearTo,
          canonicalCarVariantId: carVariantId,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Не удалось сохранить диапазон поколения: ${(err as Error).message}`,
      );
    }
  }

  private assembleReportFromBlocks(blocks: CarReportBlock[]): CarReport {
    const byType = Object.fromEntries(blocks.map((b) => [b.type, b.content]));
    return carReportSchema.parse({
      specs: byType.SPECS,
      problems: byType.PROBLEMS,
      costs: byType.COSTS,
      insurance: byType.INSURANCE,
      price: byType.PRICE,
      checklistBeforeBuying: byType.CHECKLIST,
    });
  }
}
