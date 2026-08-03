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
 * Модель теперь реально ищет в интернете (см. AggregatorAiProvider — Responses
 * API с инструментом web_search), а не только полагается на contextChunks.
 *
 * contextChunks — это не единственный источник, а "уже проверенная опора":
 * то, что мы заранее собрали и человеком сверили (src/data/car-seed-dataset.ts).
 * Модели явно говорим — это стартовая точка, а свежие/недостающие данные
 * (особенно цену) нужно дополнительно проверить поиском самой. Так надёжнее,
 * чем полагаться на что-то одно: статика не устаревает молча, а поиск не
 * держится за возможно неточные обрывки без проверки.
 *
 * Важно: модель должна ПЕРЕСКАЗЫВАТЬ найденное своими словами, а не
 * копировать целые абзацы с сайтов — это прямое требование в промпте ниже,
 * не только вопрос вкуса, а нужно и для избежания проблем с авторским правом.
 */
export function buildCarReportPrompt(car: CarVariantInput, contextChunks: string[]) {
  const carDescription = [
    car.brand,
    car.model,
    car.generation ? `(${car.generation})` : '',
    `${car.yearFrom}${car.yearTo ? `-${car.yearTo}` : '+'}`,
    car.engine ?? '',
    car.bodyType ? `кузов: ${car.bodyType}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const systemPrompt = `Ты — автоэксперт, который готовит структурированные отчёты для покупателей подержанных автомобилей на рынке СНГ.
У тебя есть доступ к веб-поиску — используй его, чтобы найти актуальные характеристики, реальные отзывы владельцев о типичных проблемах и текущий диапазон цен на вторичном рынке СНГ.
Правила:
- Отвечай СТРОГО валидным JSON, без markdown-обёртки, без комментариев.
- Найденную в интернете информацию перескажи СВОИМИ СЛОВАМИ и обобщи — никогда не копируй дословно предложения или абзацы с сайтов, которые нашёл. Это обязательное требование, не рекомендация.
- Блок price (рыночная цена) — самый важный для проверки поиском: он быстро устаревает, обязательно ищи актуальные объявления/агрегаторы, а не полагайся только на память.
- Не выдумывай точные цифры без опоры на найденное — используй разумные диапазоны (min/max), а не одно число, кроме median в price.
- Проблемы двигателей указывай отдельно для каждого мотора, а не общо по модели.
- Если ни в контексте, ни в поиске не нашлось данных по какому-то полю — заполни его наиболее вероятной оценкой на основе общих знаний о классе автомобиля и явно сделай диапазон шире, но никогда не оставляй поле пустым.
- Пиши на русском языке.`;

  const contextBlock = contextChunks.length
    ? `Уже проверенная опора (используй как стартовую точку, при необходимости уточни/обнови поиском, особенно цену):\n${contextChunks.join('\n---\n')}`
    : 'Стартовых данных по этой машине у нас пока нет — обязательно ищи информацию в интернете сам, не полагайся только на общие знания.';

  const userPrompt = `Автомобиль: ${carDescription}\n\n${contextBlock}\n\nСформируй отчёт по следующей структуре (это описание JSON-схемы, верни данные именно в такой форме): specs (engines[]: {name, horsePower, fuelType, transmissionOptions, overhaulMileageKm? {min,max} — средний пробег до капитального ремонта двигателя по опыту владельцев, не указывай для электромоторов}, bodyTypes[], driveTypes[]), problems (byEngine[]: {engine, commonIssues[]: {title, description, mileageOrAgeHint?, severity}}), costs (fuelPerYearRub {min,max}, maintenancePerYearRub {min,max}, partsAvailability, partsNote), insurance (osagoPerYearRub {min,max}, kaskoPerYearRub? {min,max}, transportTaxNote), price (marketPriceRub {min,max,median}, asOfDate, depreciationNote?), checklistBeforeBuying[].`;

  return { systemPrompt, userPrompt };
}
