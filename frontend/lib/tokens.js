export const tokens = {
  bg: '#0B0C0E',
  bgGradientTop: '#121417',
  surface: '#16181C',
  line: '#2A2D32',
  ink: '#F5F5F3',
  inkSoft: '#9A9FA6',
  red: '#E6392B',
  redSoft: 'rgba(230, 57, 43, 0.15)',
  amber: '#F5A623',
  amberSoft: 'rgba(245, 166, 35, 0.15)',
  blue: '#3B82F6',
};

export const FONT_IMPORT_URL =
  'https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';

export function fmtRub(n) {
  return new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
}
