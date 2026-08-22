import { z } from "zod";

/**
 * looseNumber — модель иногда присылает число как строку ("150") или даже
 * как вложенный объект ({value: 150} и подобное) вместо простого number.
 * Вместо того чтобы ронять валидацию и тратить деньги на повторный вызов
 * из-за формата — сами вытаскиваем число из того, что пришло.
 */
const looseNumber = z.preprocess((val) => {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseFloat(val.replace(",", ".").replace(/[^\d.-]/g, ""));
    return Number.isNaN(n) ? val : n;
  }
  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (typeof obj.min === "number" && typeof obj.max === "number")
      return (obj.min + obj.max) / 2;
    const firstNumber = Object.values(obj).find((v) => typeof v === "number");
    if (typeof firstNumber === "number") return firstNumber;
  }
  return val;
}, z.number());

export const specsSchema = z.object({
  engines: z.array(
    z.object({
      name: z.string(), // "1.6 MPI"
      horsePower: looseNumber,
      fuelType: z.enum(["petrol", "diesel", "hybrid", "electric", "gas"]),
      transmissionOptions: z.array(z.string()),
      overhaulMileageKm: z
        .object({ min: looseNumber, max: looseNumber })
        .optional(),
      fuelConsumptionL100km: looseNumber.optional(),
    }),
  ),
  bodyTypes: z.array(z.string()),
  driveTypes: z.array(z.string()),
  trims: z.array(z.string()).optional(),
  generationYearFrom: looseNumber.optional(),
  generationYearTo: looseNumber.nullable().optional(),
});

export const problemsSchema = z.object({
  byEngine: z.array(
    z.object({
      engine: z.string(),
      commonIssues: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          mileageOrAgeHint: z.string().optional(),
          severity: z.enum(["minor", "moderate", "critical"]),
        }),
      ),
    }),
  ),
});

export const costsSchema = z.object({
  fuelPerYearRub: z.object({ min: looseNumber, max: looseNumber }),
  maintenancePerYearRub: z.object({ min: looseNumber, max: looseNumber }),
  partsAvailability: z.enum(["excellent", "good", "limited", "poor"]),
  partsNote: z.string(),
});

export const insuranceSchema = z.object({
  osagoPerYearRub: z.object({ min: looseNumber, max: looseNumber }),
  kaskoPerYearRub: z.object({ min: looseNumber, max: looseNumber }).optional(),
  transportTaxNote: z.string(),
});

export const priceSchema = z.object({
  marketPriceRub: z.object({
    min: looseNumber,
    max: looseNumber,
    median: looseNumber,
  }),
  asOfDate: z.string(),
  depreciationNote: z.string().optional(),
});

export const checklistSchema = z.array(z.string());

export const carReportSchema = z.object({
  specs: specsSchema,
  problems: problemsSchema,
  costs: costsSchema,
  insurance: insuranceSchema,
  price: priceSchema,
  checklistBeforeBuying: checklistSchema,
});

export type CarReport = z.infer<typeof carReportSchema>;
