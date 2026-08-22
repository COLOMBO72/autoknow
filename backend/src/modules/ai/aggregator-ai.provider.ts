import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { PrismaService } from "../prisma/prisma.service";
import { ConcurrencyLimiter } from "./concurrency-limiter";
import {
  AiProvider,
  StructuredGenerationRequest,
  StructuredGenerationResult,
} from "./ai-provider.interface";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * primary и fallback — два независимых провайдера (base_url + ключ +
 * модель каждый), не просто вторая модель у того же агрегатора. Каждый
 * вызов логируется в AiCallLog (видно в админке, вкладка "здоровье AI").
 *
 * Порядок попыток в generateStructuredInner:
 * 1. primary
 * 2. primary ещё раз (через паузу — часто разовая заминка/лимит запросов)
 * 3. если ошибка похожа на сбой именно инструмента веб-поиска (а не
 *    самой модели) — пробуем primary БЕЗ поиска, на одних знаниях модели
 * 4. fallback (если настроен) — как последний рубеж
 */
@Injectable()
export class AggregatorAiProvider implements AiProvider {
  private readonly logger = new Logger(AggregatorAiProvider.name);

  private readonly primaryClient: OpenAI;
  private readonly primaryModel: string;
  private readonly primaryBaseUrl: string;

  private readonly fallbackClient: OpenAI | null;
  private readonly fallbackModel: string | null;
  private readonly fallbackBaseUrl: string | null;

  private readonly limiter: ConcurrencyLimiter;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.primaryBaseUrl = this.config.getOrThrow("AI_BASE_URL");
    this.primaryClient = new OpenAI({
      baseURL: this.primaryBaseUrl,
      apiKey: this.config.getOrThrow("AI_API_KEY"),
    });
    this.primaryModel = this.config.getOrThrow("AI_MODEL");

    const fallbackBaseUrl = this.config.get("AI_FALLBACK_BASE_URL");
    const fallbackApiKey = this.config.get("AI_FALLBACK_API_KEY");
    const fallbackModel = this.config.get("AI_FALLBACK_MODEL");

    if (fallbackBaseUrl && fallbackApiKey && fallbackModel) {
      this.fallbackBaseUrl = fallbackBaseUrl;
      this.fallbackClient = new OpenAI({
        baseURL: fallbackBaseUrl,
        apiKey: fallbackApiKey,
      });
      this.fallbackModel = fallbackModel;
    } else {
      this.fallbackBaseUrl = null;
      this.fallbackClient = null;
      this.fallbackModel = null;
    }

    this.limiter = new ConcurrencyLimiter(
      Number(this.config.get("AI_MAX_CONCURRENT") ?? 8),
    );
  }

  async generateStructured(
    req: StructuredGenerationRequest,
  ): Promise<StructuredGenerationResult> {
    return this.limiter.run(() => this.generateStructuredInner(req));
  }

  private async generateStructuredInner(
    req: StructuredGenerationRequest,
  ): Promise<StructuredGenerationResult> {
    try {
      return await this.callAndLog(
        "primary",
        this.primaryClient,
        this.primaryModel,
        this.primaryBaseUrl,
        req,
      );
    } catch (err) {
      this.logger.warn(
        `Primary не сработал (${(err as Error).message}), пробую ещё раз`,
      );
      await delay(2000);

      try {
        return await this.callAndLog(
          "primary",
          this.primaryClient,
          this.primaryModel,
          this.primaryBaseUrl,
          req,
        );
      } catch (err2) {
        const msg = (err2 as Error).message;
        const looksLikeToolFailure =
          req.useWebSearch !== false && /tool|search/i.test(msg);

        if (looksLikeToolFailure) {
          this.logger.warn(
            "Похоже на сбой инструмента поиска, пробую без веб-поиска",
          );
          await delay(2000);
          try {
            return await this.callAndLog(
              "primary",
              this.primaryClient,
              this.primaryModel,
              this.primaryBaseUrl,
              {
                ...req,
                useWebSearch: false,
              },
            );
          } catch (err3) {
            if (!this.fallbackClient) throw err3;
            this.logger.warn("Не получилось и без поиска, пробую fallback");
            return await this.callAndLog(
              "fallback",
              this.fallbackClient,
              this.fallbackModel!,
              this.fallbackBaseUrl!,
              req,
            );
          }
        }

        if (!this.fallbackClient) throw err2;
        this.logger.warn("Primary не сработал дважды, пробую fallback");
        return await this.callAndLog(
          "fallback",
          this.fallbackClient,
          this.fallbackModel!,
          this.fallbackBaseUrl!,
          req,
        );
      }
    }
  }

  private async callAndLog(
    provider: "primary" | "fallback",
    client: OpenAI,
    model: string,
    baseUrl: string,
    req: StructuredGenerationRequest,
  ): Promise<StructuredGenerationResult> {
    const startedAt = Date.now();
    try {
      const result = await this.callModel(client, model, req);
      await this.logCall(
        provider,
        baseUrl,
        model,
        true,
        null,
        Date.now() - startedAt,
      );
      return result;
    } catch (err) {
      await this.logCall(
        provider,
        baseUrl,
        model,
        false,
        (err as Error).message,
        Date.now() - startedAt,
      );
      throw err;
    }
  }

  private async logCall(
    provider: string,
    baseUrl: string,
    model: string,
    success: boolean,
    errorMessage: string | null,
    latencyMs: number,
  ) {
    try {
      await this.prisma.aiCallLog.create({
        data: { provider, baseUrl, model, success, errorMessage, latencyMs },
      });
    } catch (err) {
      this.logger.warn(
        `Не удалось записать AiCallLog: ${(err as Error).message}`,
      );
    }
  }

  private async callModel(
    client: OpenAI,
    model: string,
    req: StructuredGenerationRequest,
  ): Promise<StructuredGenerationResult> {
    const response = await client.responses.create({
      model,
      instructions: req.systemPrompt,
      input: req.userPrompt,
      tools:
        req.useWebSearch === false
          ? undefined
          : [{ type: "web_search_preview" }],
      text: { format: { type: "json_object" } },
      temperature: 0.2,
    });

    const raw = response.output_text ?? "";
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
