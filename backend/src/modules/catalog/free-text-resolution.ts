import { z } from "zod";

export const freeTextResolutionSchema = z.discriminatedUnion("valid", [
  z.object({
    valid: z.literal(true),
    brand: z.string(), // нормализованное название на английском, например "Kia"
    model: z.string(), // нормализованное, например "Rio"
    yearFrom: z.number(),
  }),
  z.object({
    valid: z.literal(false),
    reason: z.string(), // короткая причина на русском — покажем человеку
  }),
]);

export type FreeTextResolution = z.infer<typeof freeTextResolutionSchema>;

export function buildFreeTextResolutionPrompt(text: string) {
  const systemPrompt = `Ты проверяешь, ввёл ли человек название реальной модели автомобиля (возможно с опечатками, сокращениями, в любом порядке слов, кириллицей или латиницей) и определяешь год выпуска.
Правила:
- Отвечай СТРОГО валидным JSON, без markdown, без пояснений.
- Если это похоже на настоящую существующую модель автомобиля — верни {"valid": true, "brand": "...", "model": "...", "yearFrom": ...}. brand и model — в нормализованном международном написании на английском (например "Kia", "Rio", не "киа" и не "К-Рио"). yearFrom — число, правдоподобный год для этой модели (обычно 1990-2026).
- Если текст явно бессмысленный, не про автомобиль, слишком расплывчатый (например только марка без модели), или год явно нереалистичен (модель не существовала в этот год/в будущем) — верни {"valid": false, "reason": "краткое объяснение на русском, 1 предложение"}.
- Если сомневаешься — лучше вернуть valid: false с понятной причиной, чем угадывать.`;

  const userPrompt = `Текст от пользователя: "${text}"\n\nВерни ответ в формате JSON, как описано выше.`;

  return { systemPrompt, userPrompt };
}
