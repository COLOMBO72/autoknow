import ReportView from './ReportView';

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// Метаданные генерируются из параметров URL, БЕЗ обращения к платному API —
// специально, чтобы просмотр страницы поисковым роботом никогда не приводил
// к списанию денег с чьего-то баланса (сама генерация отчёта — платное
// действие пользователя на клиенте, а не побочный эффект рендера страницы).
export async function generateMetadata({ searchParams }) {
  const brand = cap(searchParams.brand);
  const model = cap(searchParams.model);
  const year = searchParams.yearFrom;

  if (!brand || !model || !year) {
    return { title: 'Отчёт по автомобилю | autoknow' };
  }

  const title = `${brand} ${model} ${year} — надёжность, расходы, цена | autoknow`;
  const description = `Двигатели, типичные болячки, расходы на топливо и ТО, актуальная цена ${brand} ${model} ${year} года на вторичном рынке СНГ — отчёт на основе живого поиска ИИ.`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'article' },
  };
}

export default function ReportPage() {
  return <ReportView />;
}
