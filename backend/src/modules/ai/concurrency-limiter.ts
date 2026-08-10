/**
 * Ограничивает число одновременных выполнений fn(). Лишние вызовы не
 * падают с ошибкой — просто ждут своей очереди (обычно доли секунды при
 * нормальной нагрузке, дольше — при реальном всплеске в тысячи запросов).
 * Нужно, чтобы не упереться в лимит запросов в минуту у AI-агрегатора
 * при резком всплеске трафика.
 */
export class ConcurrencyLimiter {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.maxConcurrent) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}
