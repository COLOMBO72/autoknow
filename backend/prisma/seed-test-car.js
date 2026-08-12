// Разовый тестовый сид — Kia Rio 2019 с реалистичными, но выдуманными
// данными, чтобы проверить, как выглядит превью (заблюренное) и полный
// отчёт (после покупки) без подключённого AITunnel.
//
// Запуск: cd backend && node prisma/seed-test-car.js
//
// aiModel помечен как 'seed-test-data' — видно в БД, что это не настоящий
// ответ ИИ. Перед реальным запуском эту запись стоит удалить или заменить
// на настоящую (через тот же путь, что и обычный кэш — сама перезапишется,
// когда TTL истечёт и придёт первый реальный запрос).

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FAR_FUTURE = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

const BLOCKS = {
  SPECS: {
    engines: [
      { name: '1.4 MPI', horsePower: 100, fuelType: 'petrol', transmissionOptions: ['механика'] },
      {
        name: '1.6 MPI',
        horsePower: 123,
        fuelType: 'petrol',
        transmissionOptions: ['механика', 'автомат 6-ст.'],
        overhaulMileageKm: { min: 200000, max: 260000 },
      },
    ],
    bodyTypes: ['Седан'],
    driveTypes: ['Передний'],
    trims: ['Classic', 'Comfort', 'Prestige', 'Luxe'],
  },
  PROBLEMS: {
    byEngine: [
      {
        engine: '1.6 MPI',
        commonIssues: [
          {
            title: 'Растяжение цепи ГРМ',
            description: 'Стук цепи на холодную, риск проскальзывания при пропуске замены масла вовремя.',
            mileageOrAgeHint: '90 000 – 130 000 км',
            severity: 'moderate',
          },
          {
            title: 'Сколы лакокрасочного покрытия',
            description: 'ЛКП немного мягче, чем у конкурентов класса — чаще требует подкраски сколов.',
            severity: 'minor',
          },
        ],
      },
    ],
  },
  COSTS: {
    fuelPerYearRub: { min: 65000, max: 95000 },
    maintenancePerYearRub: { min: 25000, max: 45000 },
    partsAvailability: 'excellent',
    partsNote: 'Оригинал и аналоги доступны повсеместно, одна из самых дешёвых моделей в обслуживании.',
  },
  INSURANCE: {
    osagoPerYearRub: { min: 7000, max: 14000 },
    kaskoPerYearRub: { min: 35000, max: 60000 },
    transportTaxNote: 'Зависит от региона — обычно 1 500–3 000 ₽/год для мотора мощностью 123 л.с.',
  },
  PRICE: {
    marketPriceRub: { min: 950000, max: 1450000, median: 1180000 },
    asOfDate: 'тестовые данные',
    depreciationNote: 'Это тестовые данные для проверки интерфейса, не реальная рыночная оценка.',
  },
  CHECKLIST: [
    'Прослушать двигатель на холодную — характерный стук цепи ГРМ',
    'Проверить в сервисной книжке регулярность замены масла',
    'Осмотреть кузов на сколы и следы недавней подкраски',
    'Прогнать автомат по всем передачам без рывков на месте',
  ],
};

async function main() {
  const carVariant = await prisma.carVariant.upsert({
    where: {
      brand_model_generation_yearFrom_yearTo_engine_bodyType: {
        brand: 'kia',
        model: 'rio',
        generation: '',
        yearFrom: 2019,
        yearTo: 0,
        engine: '',
        bodyType: '',
      },
    },
    update: {},
    create: { brand: 'kia', model: 'rio', generation: '', yearFrom: 2019, yearTo: 0, engine: '', bodyType: '' },
  });

  for (const [type, content] of Object.entries(BLOCKS)) {
    await prisma.carReportBlock.upsert({
      where: { carVariantId_type: { carVariantId: carVariant.id, type } },
      update: { content, expiresAt: FAR_FUTURE, aiModel: 'seed-test-data' },
      create: { carVariantId: carVariant.id, type, content, expiresAt: FAR_FUTURE, aiModel: 'seed-test-data' },
    });
  }

  console.log('Готово: Kia Rio 2019 с тестовыми данными в базе.');
  console.log('carVariantId:', carVariant.id);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
