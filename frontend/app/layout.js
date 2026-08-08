import { FONT_IMPORT_URL } from '../lib/tokens';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'),
  title: {
    default: 'autoknow — досье на автомобиль перед покупкой',
    template: '%s',
  },
  description: 'Двигатели, типичные болячки, расходы на год вперёд и честная цена по рынку — по любой марке, модели и году.',
  openGraph: {
    siteName: 'autoknow',
    locale: 'ru_RU',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <link rel="stylesheet" href={FONT_IMPORT_URL} />
        <style>{`
          /* Без этого паддинг у любого элемента с width:100% добавляется
             ПОВЕРХ 100% ширины родителя — на узких экранах это ломает
             вёрстку почти везде, где есть формы (то есть почти на каждой
             странице сайта). Один global-reset чинит это разом. */
          *, *::before, *::after { box-sizing: border-box; }
          html, body { overflow-x: hidden; max-width: 100%; }

          /* Шрифт полей ввода меньше 16px заставляет iOS Safari
             непроизвольно зумить страницу при тапе в поле — раздражает
             и выглядит как "всё сломано". Поднимаем только на мобильных,
             чтобы не менять вид на десктопе. */
          @media (max-width: 768px) {
            input, select, textarea { font-size: 16px !important; }
          }
        `}</style>
      </head>
      <body style={{ margin: 0, background: '#0B0C0E' }}>{children}</body>
    </html>
  );
}
