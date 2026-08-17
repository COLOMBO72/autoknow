import { tokens } from "../../lib/tokens";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const metadata = {
  title: "Цены, тарифы | autoknow",
  robots: { index: true, follow: true },
};

function Section({ n, title, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontFamily: "'Anton', sans-serif",
          fontSize: 18,
          letterSpacing: "0.01em",
          margin: "0 0 10px",
          color: tokens.ink,
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: 14.5, lineHeight: 1.7, color: tokens.inkSoft }}>
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: tokens.bg,
        color: tokens.ink,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <SiteHeader maxWidth={760} />
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px 60px" }}>
        <h1
          style={{
            fontFamily: "'Anton', sans-serif",
            fontSize: "clamp(26px, 4vw, 36px)",
            margin: "0 0 8px",
          }}
        >
          ЦЕНА И ТАРИФЫ
        </h1>
        <p style={{ fontSize: 13, color: tokens.inkSoft, marginBottom: 32 }}>
          Последнее обновление: 17.08.2026
        </p>
        <Section title="СТОИМОСТЬ ОДНОГО ОТЧЕТА - 79 РУБЛЕЙ">
          <p>
            Вы указываете марку, модель, год. Оплачиваете и получаете отчет.
          </p>
          <h1
            style={{
              fontFamily: "'Anton', sans-serif",
              fontSize: "clamp(12px, 4vw, 12px)",
              margin: "0 0 8px",
            }}
          >
            В отчёте вы получаете:
          </h1>
          <p>
            1. Проблемы этого автомобиля: "болезни", проблемы двигателя,
            километраж до КАПИТАЛЬНОГО РЕМОНТА ДВИГАТЕЛЯ.
          </p>
          <p>
            2. Расходы на автомобиль в год! Расход на ТО, бензин, запчасти,
            ремонт.
          </p>
          <p>
            3. Название и количество двигателей автомобиля, средний пробег КМ до
            капитального ремонта, основные болезни двигателя, описание всех
            болезней и примерный километраж когда они возникают.
          </p>
          <p>4. Доступность запчастей на этот автомобиль.</p>
          <p>5. Примерная цена на рынке.</p>
          <p>
            6. ЧЕКЛИСТ ПЕРЕД ПОКУПКОЙ ДАННОГО АВТОМОБИЛЯ. Что нужно проверить,
            где посмотреть, что послушать и тому подобное.
          </p>
        </Section>
        <h1
          style={{
            fontFamily: "'Anton', sans-serif",
            fontSize: "clamp(12px, 4vw, 12px)",
            margin: "0 0 8px",
          }}
        >
          *Все цифры и данные которые вы получаете в отчёте взяты из открытых
          источников и статистики. Они максимально приближены к реальному
          владению авто, НО учитывайте что каждый владеет своим автомобилем
          индивидуально и цифры могут отличаться в зависимости от различных
          ситуаций.
        </h1>
      </main>
      <SiteFooter />
    </div>
  );
}
