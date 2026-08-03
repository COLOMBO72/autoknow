import { Injectable } from '@nestjs/common';
import { CAR_SEED_DATASET } from '../../data/car-seed-dataset';

interface CarVariantInput {
  brand: string;
  model: string;
  generation?: string;
  yearFrom: number;
  yearTo?: number;
  engine?: string;
  bodyType?: string;
}

/**
 * Phase 0: ищем по сид-датасету (src/data/car-seed-dataset.ts, ~12 моделей).
 * Матчинг по brand+model без учёта регистра — этого достаточно, чтобы
 * прогнать пайплайн end-to-end. Поколение/год пока не фильтруют выборку
 * (модель сама разберётся по контексту), это огрубление стоит убрать,
 * когда датасет вырастет и появятся конфликтующие поколения одной модели.
 *
 * Когда датасет перерастёт статический TS-файл — заменить на запрос в БД
 * или векторный поиск, контракт (Promise<string[]>) не изменится.
 */
@Injectable()
export class CarContextProvider {
  async getContextChunks(car: CarVariantInput): Promise<string[]> {
    const normalize = (s: string) => s.trim().toLowerCase();
    const entry = CAR_SEED_DATASET.find(
      (e) => normalize(e.brand) === normalize(car.brand) && normalize(e.model) === normalize(car.model),
    );

    if (!entry) {
      // Модели нет в сид-датасете — явно предупреждаем модель в промпте,
      // а не молча возвращаем пустоту (см. car-report.prompt.ts: пустой
      // контекст = модель расширяет диапазоны и явно снижает точность).
      return [];
    }

    const chunks = [...entry.chunks];
    if (entry.marketPriceHint) {
      chunks.push(
        `Черновой ориентир цены (может быть устаревшим, использовать только как отправную точку, при сомнении — расширить диапазон): ${entry.marketPriceHint}`,
      );
    }
    return chunks;
  }
}
