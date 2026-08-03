import { ReportBlockType } from '@prisma/client';

/** TTL в днях для каждого типа блока отчёта. */
export const REPORT_TTL_DAYS: Record<ReportBlockType, number> = {
  SPECS: 365, // характеристики и моторы меняются только со сменой поколения
  PROBLEMS: 270, // типичные болячки — обновляем раз в 9 мес на всякий случай
  COSTS: 90, // ТО/запчасти/топливо — цены дрейфуют, но не резко
  INSURANCE: 120, // тарифы ОСАГО/КАСКО меняются не часто
  PRICE: 10, // самый волатильный блок — рыночная цена
};

export function calculateExpiresAt(type: ReportBlockType, from: Date = new Date()): Date {
  const days = REPORT_TTL_DAYS[type];
  const expires = new Date(from);
  expires.setDate(expires.getDate() + days);
  return expires;
}
