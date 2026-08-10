import { CarReport } from './car-report.schema';

/**
 * Бесплатный превью-отчёт. Отдаём характеристики целиком (это и есть
 * "зацепка" — человек видит, что данные настоящие и подробные), а по
 * болячкам/расходам/страховке/цене — только факт наличия и количество,
 * БЕЗ реальных цифр и текста. Это не косметика: если бы мы отправляли
 * настоящие данные с блюром через CSS, их было бы видно в Network-вкладке
 * браузера за 10 секунд — урезаем на бэкенде, а не прячем на фронте.
 */
export interface RedactedReport {
  specs: CarReport['specs'];
  locked: true;
  teaser: {
    totalIssues: number;
    hasCritical: boolean;
    hasModerate: boolean;
    checklistItemsCount: number;
  };
}

export function redactReport(report: CarReport): RedactedReport {
  const allIssues = report.problems.byEngine.flatMap((g) => g.commonIssues);

  return {
    specs: report.specs,
    locked: true,
    teaser: {
      totalIssues: allIssues.length,
      hasCritical: allIssues.some((i) => i.severity === 'critical'),
      hasModerate: allIssues.some((i) => i.severity === 'moderate'),
      checklistItemsCount: report.checklistBeforeBuying.length,
    },
  };
}
