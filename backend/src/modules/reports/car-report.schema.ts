import { z } from "zod";

/**
 * Схема одного блока отчёта. Модель должна вернуть JSON строго такой формы —
 * это и есть response_schema, которую мы описываем словами в промпте
 * (см. prompts/car-report.prompt.ts) и проверяем здесь после парсинга.
 */

export const specsSchema = z.object({
  engines: z.array(
    z.object({
      name: z.string(), // "1.6 MPI"
      horsePower: z.number(),
      fuelType: z.enum(["petrol", "diesel", "hybrid", "electric", "gas"]),
      transmissionOptions: z.array(z.string()),
      overhaulMileageKm: z
        .object({ min: z.number(), max: z.number() })
        .optional(), // средний пробег до капремонта; необязательно — для электро и совсем новых моторов данных может не быть
    }),
  ),
  bodyTypes: z.array(z.string()),
  driveTypes: z.array(z.string()),
  generationYearFrom: z.coerce.number().optional(), // с какого года это поколение/рестайлинг
  generationYearTo: z.coerce.number().nullable().optional(), // по какой год, null = выпускается до сих пор
  trims: z.array(z.string()).optional(), // названия комплектаций, например "Classic", "Comfort", "Prestige"
});

export const problemsSchema = z.object({
  // проблемы привязаны к конкретному мотору, не к модели вообще
  byEngine: z.array(
    z.object({
      engine: z.string(),
      commonIssues: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          mileageOrAgeHint: z.string().optional(), // "обычно после 150 000 км"
          severity: z.enum(["minor", "moderate", "critical"]),
        }),
      ),
    }),
  ),
});

export const costsSchema = z.object({
  fuelPerYearRub: z.object({ min: z.number(), max: z.number() }),
  maintenancePerYearRub: z.object({ min: z.number(), max: z.number() }),
  partsAvailability: z.enum(["excellent", "good", "limited", "poor"]),
  partsNote: z.string(), // например: "оригинал дорог, аналоги доступны почти на всё"
});

export const insuranceSchema = z.object({
  osagoPerYearRub: z.object({ min: z.number(), max: z.number() }),
  kaskoPerYearRub: z.object({ min: z.number(), max: z.number() }).optional(),
  transportTaxNote: z.string(), // зависит от региона и л.с., даём пояснение, не точную цифру
});

export const priceSchema = z.object({
  marketPriceRub: z.object({
    min: z.number(),
    max: z.number(),
    median: z.number(),
  }),
  asOfDate: z.string(), // дата, на которую актуальна цена — обязательно, блок короткоживущий
  depreciationNote: z.string().optional(),
});

export const checklistSchema = z.array(z.string()); // чек-лист для осмотра при покупке

export const carReportSchema = z.object({
  specs: specsSchema,
  problems: problemsSchema,
  costs: costsSchema,
  insurance: insuranceSchema,
  price: priceSchema,
  checklistBeforeBuying: checklistSchema,
});

export type CarReport = z.infer<typeof carReportSchema>;
