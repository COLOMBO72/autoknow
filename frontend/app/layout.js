import { FONT_IMPORT_URL } from '../lib/tokens';
import './globals.css';

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
      </head>
      <body>{children}</body>
    </html>
  );
}
