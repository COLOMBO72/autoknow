import { FONT_IMPORT_URL } from '../lib/tokens';

export const metadata = {
  title: 'autoknow — досье на автомобиль перед покупкой',
  description: 'Двигатели, типичные болячки, расходы на год вперёд и честная цена по рынку — по любой марке, модели и году.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        <link rel="stylesheet" href={FONT_IMPORT_URL} />
      </head>
      <body style={{ margin: 0, background: '#0B0C0E' }}>{children}</body>
    </html>
  );
}
