import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CAR_SEED_DATASET } from '../../data/car-seed-dataset';

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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Вызывается из ReportsService после КАЖДОЙ свежей генерации отчёта.
   * Ничего не запрашивает у AI дополнительно — просто разбирает то, что
   * модель и так вернула в specs, и докладывает в общую копилку по
   * бренду+модели. Так каталог наполняется бесплатно, запрос за запросом.
   */
  async recordDiscoveredVariants(car: DiscoveredFrom, specs: DiscoveredSpecs): Promise<void> {
    const brand = car.brand.trim().toLowerCase();
    const model = car.model.trim().toLowerCase();

    const existing = await this.prisma.carCatalogEntry.findUnique({
      where: { brand_model: { brand, model } },
    });

    const engineNames = specs.engines.map((e) => e.name).filter(Boolean);
    const newGeneration = car.generation ? [car.generation.trim().toLowerCase()] : [];

    const knownGenerations = union((existing?.knownGenerations as string[]) ?? [], newGeneration);
    const knownEngines = union((existing?.knownEngines as string[]) ?? [], engineNames);
    const knownBodyTypes = union((existing?.knownBodyTypes as string[]) ?? [], specs.bodyTypes ?? []);

    const candidateMaxYear = car.yearTo ?? car.yearFrom;
    const minYearSeen = Math.min(existing?.minYearSeen ?? car.yearFrom, car.yearFrom);
    const maxYearSeen = Math.max(existing?.maxYearSeen ?? candidateMaxYear, candidateMaxYear);

    await this.prisma.carCatalogEntry.upsert({
      where: { brand_model: { brand, model } },
      update: { knownGenerations, knownEngines, knownBodyTypes, minYearSeen, maxYearSeen },
      create: { brand, model, knownGenerations, knownEngines, knownBodyTypes, minYearSeen, maxYearSeen },
    });
  }

  async getKnownVariants(brand: string, model: string): Promise<KnownVariants> {
    const entry = await this.prisma.carCatalogEntry.findUnique({
      where: {
        brand_model: { brand: brand.trim().toLowerCase(), model: model.trim().toLowerCase() },
      },
    });

    return {
      generations: (entry?.knownGenerations as string[]) ?? [],
      engines: (entry?.knownEngines as string[]) ?? [],
      bodyTypes: (entry?.knownBodyTypes as string[]) ?? [],
    };
  }

  /**
   * Шаг 1-2 формы (марка/модель) — единственное, что физически не может
   * само себя пополнить (см. обсуждение курицы-и-яйца), поэтому источник —
   * руками собранный car-seed-dataset, а не БД. Когда список моделей
   * вырастет настолько, что держать его в коде неудобно — переносим в
   * отдельную таблицу, сигнатура метода не изменится.
   */
  getBrandModelCatalog(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const entry of CAR_SEED_DATASET) {
      const brandLabel = capitalize(entry.brand);
      const modelLabel = capitalize(entry.model);
      if (!result[brandLabel]) result[brandLabel] = [];
      if (!result[brandLabel].includes(modelLabel)) result[brandLabel].push(modelLabel);
    }
    return result;
  }
}

function capitalize(s: string): string {
  return s.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}
