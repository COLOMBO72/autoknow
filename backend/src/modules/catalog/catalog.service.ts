import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CAR_SEED_DATASET } from "../../data/car-seed-dataset";
import { AI_PROVIDER, AiProvider } from "../ai/ai-provider.interface";
import { Inject } from "@nestjs/common";
import {
  buildFreeTextResolutionPrompt,
  freeTextResolutionSchema,
} from "./free-text-resolution";

interface DiscoveredFrom {
  brand: string;
  model: string;
  generation?: string;
  yearFrom: number;
  yearTo?: number;
}

interface DiscoveredSpecs {
  engines: { name: string }[];
  bodyTypes: string[];
}

export interface KnownVariants {
  generations: string[];
  engines: string[];
  bodyTypes: string[];
}

function union(a: string[], b: string[]): string[] {
  return Array.from(new Set([...a, ...b].filter(Boolean)));
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
  ) {}

  /**
   * Вызывается из ReportsService после КАЖДОЙ свежей генерации отчёта.
   * Ничего не запрашивает у AI дополнительно — просто разбирает то, что
   * модель и так вернула в specs, и докладывает в общую копилку по
   * бренду+модели. Так каталог наполняется бесплатно, запрос за запросом.
   */
  async recordDiscoveredVariants(
    car: DiscoveredFrom,
    specs: DiscoveredSpecs,
  ): Promise<void> {
    const brand = car.brand.trim().toLowerCase();
    const model = car.model.trim().toLowerCase();

    const existing = await this.prisma.carCatalogEntry.findUnique({
      where: { brand_model: { brand, model } },
    });

    const engineNames = specs.engines.map((e) => e.name).filter(Boolean);
    const newGeneration = car.generation
      ? [car.generation.trim().toLowerCase()]
      : [];

    const knownGenerations = union(
      (existing?.knownGenerations as string[]) ?? [],
      newGeneration,
    );
    const knownEngines = union(
      (existing?.knownEngines as string[]) ?? [],
      engineNames,
    );
    const knownBodyTypes = union(
      (existing?.knownBodyTypes as string[]) ?? [],
      specs.bodyTypes ?? [],
    );

    const candidateMaxYear = car.yearTo ?? car.yearFrom;
    const minYearSeen = Math.min(
      existing?.minYearSeen ?? car.yearFrom,
      car.yearFrom,
    );
    const maxYearSeen = Math.max(
      existing?.maxYearSeen ?? candidateMaxYear,
      candidateMaxYear,
    );

    await this.prisma.carCatalogEntry.upsert({
      where: { brand_model: { brand, model } },
      update: {
        knownGenerations,
        knownEngines,
        knownBodyTypes,
        minYearSeen,
        maxYearSeen,
      },
      create: {
        brand,
        model,
        knownGenerations,
        knownEngines,
        knownBodyTypes,
        minYearSeen,
        maxYearSeen,
      },
    });
  }

  async getKnownVariants(brand: string, model: string): Promise<KnownVariants> {
    const entry = await this.prisma.carCatalogEntry.findUnique({
      where: {
        brand_model: {
          brand: brand.trim().toLowerCase(),
          model: model.trim().toLowerCase(),
        },
      },
    });

    return {
      generations: (entry?.knownGenerations as string[]) ?? [],
      engines: (entry?.knownEngines as string[]) ?? [],
      bodyTypes: (entry?.knownBodyTypes as string[]) ?? [],
    };
  }

  /**
   * Шаг 1-2 формы (марка/модель). Источник — объединение руками собранного
   * car-seed-dataset (статика в коде) и таблицы CarCatalogModel (модели,
   * добавленные динамически через "не нашли машину? напишите" после
   * проверки ИИ — см. resolveFreeText). Второе не требует пересборки сайта.
   */
  async getBrandModelCatalog(): Promise<Record<string, string[]>> {
    const result: Record<string, string[]> = {};

    const add = (brandRaw: string, modelRaw: string) => {
      const brandLabel = capitalize(brandRaw);
      const modelLabel = capitalize(modelRaw);
      if (!result[brandLabel]) result[brandLabel] = [];
      if (!result[brandLabel].includes(modelLabel))
        result[brandLabel].push(modelLabel);
    };

    for (const entry of CAR_SEED_DATASET) {
      add(entry.brand, entry.model);
    }

    const dynamic = await this.prisma.carCatalogModel.findMany();
    for (const entry of dynamic) {
      add(entry.brand, entry.model);
    }

    return result;
  }

  /** Регистрирует марку+модель в динамическом каталоге — идемпотентно, повторный вызов не страшен. */
  async addBrandModel(brand: string, model: string): Promise<void> {
    const b = brand.trim().toLowerCase();
    const m = model.trim().toLowerCase();
    await this.prisma.carCatalogModel.upsert({
      where: { brand_model: { brand: b, model: m } },
      update: {},
      create: { brand: b, model: m },
    });
  }

  /**
   * Дешёвая проверка свободного текста ("не нашли машину? напишите") —
   * БЕЗ веб-поиска, модель просто определяет по своим знаниям, похоже ли
   * это на реальный автомобиль, и нормализует написание. Полная (дорогая,
   * с поиском) генерация отчёта запускается только если это подтверждено —
   * так мусорные запросы не тратят токены и не засоряют базу.
   */
  async resolveFreeText(
    text: string,
  ): Promise<{ brand: string; model: string; yearFrom: number }> {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 3 || trimmed.length > 100) {
      throw new BadRequestException(
        'Опиши модель короче и понятнее — например "Mazda 6 2015"',
      );
    }

    const { systemPrompt, userPrompt } = buildFreeTextResolutionPrompt(trimmed);
    const result = await this.ai.generateStructured({
      systemPrompt,
      userPrompt,
      responseSchemaName: "FreeTextResolution",
      useWebSearch: false,
    });

    const parsed = freeTextResolutionSchema.parse(JSON.parse(result.raw));
    if (!parsed.valid) {
      throw new BadRequestException(parsed.reason);
    }

    await this.addBrandModel(parsed.brand, parsed.model);
    return {
      brand: parsed.brand,
      model: parsed.model,
      yearFrom: parsed.yearFrom,
    };
  }
}

function capitalize(s: string): string {
  return s.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}
