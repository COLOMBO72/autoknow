import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AiProvider,
  StructuredGenerationRequest,
  StructuredGenerationResult,
} from './ai-provider.interface';

/**
 * Агрегаторы (aitunnel.ru и т.п.), совместимые с Responses API, отдают
 * тот же контракт, что и OpenAI — достаточно поменять baseURL и ключ.
 *
 * ВАЖНО про архитектуру: этот файл отвечает ТОЛЬКО за "как заполнить кэш,
 * когда его нет". Проверка "может, у нас уже есть свежий отчёт по этой
 * машине — тогда вообще не платим" происходит раньше, в ReportsService,
 * и этот файл не трогает. Т.е. если 4 человека подряд спросят одну и ту же
 * машину — сюда доедет только первый запрос, остальные 3 отдаст кэш бесплатно.
 *
 * Используем Responses API (не Chat Completions) с включённым инструментом
 * web_search — модель реально ищет в интернете и сама пишет ответ своими
 * словами (без пересказа чужих статей построчно), это и есть механизм,
 * который убирает вопрос авторских прав и делает данные актуальными.
 *
 * Нюанс: у агрегатора Responses API может отставать от официального OpenAI
 * или иметь свои особенности — при первом реальном запуске стоит свериться
 * с документацией AITUNNEL и, если что-то не заведётся с первого раза,
 * логи здесь (this.logger.warn) покажут, на каком именно вызове упало.
 */
@Injectable()
export class AggregatorAiProvider implements AiProvider {
  private readonly logger = new Logger(AggregatorAiProvider.name);
  private readonly client: OpenAI;
  private readonly primaryModel: string;
  private readonly fallbackModel: string;

  constructor(private readonly config: ConfigService) {
    this.client = new OpenAI({
      baseURL: this.config.getOrThrow('AI_BASE_URL'),
      apiKey: this.config.getOrThrow('AI_API_KEY'),
    });
    this.primaryModel = this.config.getOrThrow('AI_MODEL');
    this.fallbackModel = this.config.get('AI_MODEL_FALLBACK') ?? this.primaryModel;
  }

  async generateStructured(req: StructuredGenerationRequest): Promise<StructuredGenerationResult> {
    try {
      return await this.callModel(this.primaryModel, req);
    } catch (err) {
      this.logger.warn(
        `Основная модель ${this.primaryModel} недоступна (${(err as Error).message}), пробую fallback ${this.fallbackModel}`,
      );
      return await this.callModel(this.fallbackModel, req);
    }
  }

  private async callModel(
    model: string,
    req: StructuredGenerationRequest,
  ): Promise<StructuredGenerationResult> {
    const response = await this.client.responses.create({
      model,
      instructions: req.systemPrompt,
      input: req.userPrompt,
      // web_search_preview — так этот инструмент называется в типах текущей
      // версии openai SDK (4.104.0). Новое имя "web_search" в некоторых
      // версиях доков OpenAI уже встречается, но SDK его пока не типизирует —
      // если агрегатор явно потребует новое имя, поменять здесь одну строку.
      tools: [{ type: 'web_search_preview' }],
      // Просим просто валидный JSON (не строгую json_schema) — точную форму
      // всё равно перепроверяем через zod в reports.service.ts после парсинга,
      // так меньше риск разъехаться с версией Responses API у агрегатора.
      text: { format: { type: 'json_object' } },
      temperature: 0.2,
    });

    const raw = response.output_text ?? '';
    if (!raw) {
      throw new Error(`Пустой ответ от модели ${model}`);
    }

    return {
      raw,
      modelUsed: model,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    };
  }
}
