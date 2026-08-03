/**
 * Абстракция над AI-провайдером.
 *
 * Зачем: сегодня это агрегатор (aitunnel/proxyapi) поверх GPT-5-mini,
 * завтра может быть другой агрегатор, прямой доступ или другая модель.
 * Вся остальная бизнес-логика (reports.service) не должна знать деталей —
 * только вызывает generateStructured().
 */
export interface StructuredGenerationRequest {
  systemPrompt: string;
  userPrompt: string;
  /** JSON-схема ответа в виде текстового описания для промпта + валидации zod снаружи */
  responseSchemaName: string;
}

export interface StructuredGenerationResult {
  raw: string; // сырой JSON-текст от модели, парсится и валидируется вызывающей стороной
  modelUsed: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AiProvider {
  generateStructured(req: StructuredGenerationRequest): Promise<StructuredGenerationResult>;
}
