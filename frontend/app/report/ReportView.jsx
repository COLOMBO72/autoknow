'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { tokens, fmtRub } from '../../lib/tokens';
import { api } from '../../lib/api';
import { ensureUserId } from '../../lib/session';
import { addToCart } from '../../lib/compareCart';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import FeedbackWidget from '../../components/FeedbackWidget';

const SEVERITY = {
  critical: { color: tokens.red, bg: tokens.redSoft, label: 'КРИТИЧНО' },
  moderate: { color: tokens.amber, bg: tokens.amberSoft, label: 'СРЕДНЕ' },
  minor: { color: tokens.inkSoft, bg: 'transparent', label: 'НЕЗНАЧИТЕЛЬНО' },
};
const FUEL_LABEL = { petrol: 'бензин', diesel: 'дизель', hybrid: 'гибрид', electric: 'электро', gas: 'газ' };
const PARTS_LABEL = { excellent: 'отличная', good: 'хорошая', limited: 'ограниченная', poor: 'слабая' };

function SectionHeader({ n, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: tokens.red }}>{n}</span>
      <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: 22, letterSpacing: '0.02em', margin: 0 }}>{title}</h2>
    </div>
  );
}

function StatTile({ label, value, delay }) {
  return (
    <div className="ak-stat" style={{ background: tokens.surface, border: `1px solid ${tokens.line}`, borderRadius: 8, padding: '16px 18px', animationDelay: `${delay}ms` }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 20 }}>{value}</div>
      <div style={{ fontSize: 12, color: tokens.inkSoft, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function RangeBar({ min, max, value }) {
  const pct = ((value - min) / (max - min || 1)) * 100;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ position: 'relative', height: 4, background: tokens.line, borderRadius: 2 }}>
        <div style={{ position: 'absolute', left: `${pct}%`, top: -3, width: 10, height: 10, borderRadius: '50%', background: tokens.red, transform: 'translateX(-50%)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11.5, color: tokens.inkSoft, fontFamily: "'JetBrains Mono', monospace" }}>
        <span>{fmtRub(min)}</span>
        <span>{fmtRub(max)}</span>
      </div>
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{ background: tokens.surface, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: 22, ...style }}>{children}</div>;
}

function carFromParams(sp) {
  const car = { brand: sp.get('brand'), model: sp.get('model'), yearFrom: Number(sp.get('yearFrom')) };
  const generation = sp.get('generation');
  const engine = sp.get('engine');
  const bodyType = sp.get('bodyType');
  if (generation) car.generation = generation;
  if (engine) car.engine = engine;
  if (bodyType) car.bodyType = bodyType;
  return car;
}

function ReportContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [addedToCompare, setAddedToCompare] = useState(false);
  const [userId, setUserId] = useState(null);

  const car = carFromParams(searchParams);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setState({ loading: true, error: null, data: null });
      try {
        const uid = await ensureUserId(api);
        if (!cancelled) setUserId(uid);
        const result = await api.purchaseReport(uid, car);
        if (!cancelled) setState({ loading: false, error: null, data: result });
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: err, data: null });
      }
    }
    if (car.brand && car.model && car.yearFrom) run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const shell = (children) => (
    <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${tokens.bgGradientTop} 0%, ${tokens.bg} 380px)`, color: tokens.ink, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .ak-stat { opacity: 0; animation: akFadeUp 0.5s ease forwards; }
        @keyframes akFadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .ak-issue { border-left: 3px solid var(--sev-color); background: var(--sev-bg); border-radius: 0 8px 8px 0; padding: 14px 16px; }
        button.ak-cta { transition: transform 0.15s ease, box-shadow 0.2s ease; }
        button.ak-cta:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px ${tokens.redSoft}; }
        .ak-link { color: ${tokens.inkSoft}; text-decoration: none; font-size: 13px; }
        .ak-link:hover { color: ${tokens.ink}; }
        @media (prefers-reduced-motion: reduce) { .ak-stat { animation: none !important; opacity: 1 !important; } }
        .ak-focus:focus-visible { outline: 2px solid ${tokens.blue}; outline-offset: 2px; }
      `}</style>
      <SiteHeader maxWidth={880} />
      <main style={{ maxWidth: 880, margin: '0 auto', padding: '0 24px 60px' }}>{children}</main>
      <SiteFooter />
    </div>
  );

  if (!car.brand || !car.model || !car.yearFrom) {
    return shell(<p style={{ color: tokens.inkSoft }}>Не хватает параметров машины. <a href="/" className="ak-link">Вернуться к выбору →</a></p>);
  }

  if (state.loading) {
    return shell(
      <div style={{ padding: '60px 0', textAlign: 'center', color: tokens.inkSoft }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>ИЩЕМ ДАННЫЕ ПО {car.brand.toUpperCase()} {car.model.toUpperCase()}…</div>
      </div>,
    );
  }

  if (state.error) {
    if (state.error.code === 'INSUFFICIENT_BALANCE') {
      return shell(
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
          <p style={{ fontSize: 16, marginBottom: 20 }}>Не хватает баланса, чтобы показать это досье.</p>
          <a
            href="/account"
            className="ak-focus ak-cta"
            style={{
              display: 'inline-block',
              fontFamily: "'Anton', sans-serif",
              fontSize: 15,
              letterSpacing: '0.02em',
              padding: '13px 22px',
              borderRadius: 8,
              background: tokens.red,
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            ПОПОЛНИТЬ БАЛАНС
          </a>
        </div>,
      );
    }
    return shell(
      <div style={{ padding: '40px 0' }}>
        <p style={{ color: tokens.red, marginBottom: 12 }}>Не получилось получить отчёт: {state.error.message}</p>
        <a href="/" className="ak-link">← Назад к выбору</a>
      </div>,
    );
  }

  const r = state.data.report;

  return shell(
    <>
      <a href="/" className="ak-link" style={{ display: 'inline-block', margin: '20px 0' }}>← Назад к выбору</a>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Anton', sans-serif", fontSize: 'clamp(28px, 4.5vw, 42px)', margin: '0 0 8px', letterSpacing: '0.01em' }}>
          {car.brand.toUpperCase()} {car.model.toUpperCase()} {car.yearFrom}
        </h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {[car.engine, car.bodyType].filter(Boolean).map((b) => (
            <span key={b} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, border: `1px solid ${tokens.line}`, borderRadius: 20, padding: '4px 10px', color: tokens.inkSoft }}>{b}</span>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: tokens.inkSoft, margin: 0 }}>
          {state.data.fromCache ? 'Из кэша — уже проверено недавно' : 'Только что собрано живым поиском ИИ'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 40 }}>
        <StatTile label="Медианная цена" value={fmtRub(r.price.marketPriceRub.median)} delay={0} />
        <StatTile label="Топливо + ТО в год" value={`${fmtRub(r.costs.fuelPerYearRub.min + r.costs.maintenancePerYearRub.min)}–${fmtRub(r.costs.fuelPerYearRub.max + r.costs.maintenancePerYearRub.max)}`} delay={100} />
        <StatTile label="ОСАГО" value={`${fmtRub(r.insurance.osagoPerYearRub.min)}–${fmtRub(r.insurance.osagoPerYearRub.max)}`} delay={200} />
      </div>

      <section style={{ marginBottom: 36 }}>
        <SectionHeader n="01" title="Двигатели и характеристики" />
        <Card>
          <div style={{ display: 'grid', gap: 12 }}>
            {r.specs.engines.map((e) => (
              <div key={e.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: `1px dashed ${tokens.line}` }}>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 600 }}>{e.name}</div>
                  <div style={{ fontSize: 12.5, color: tokens.inkSoft, marginTop: 2 }}>{FUEL_LABEL[e.fuelType] ?? e.fuelType} · {e.transmissionOptions.join(', ')}</div>
                  {e.overhaulMileageKm && (
                    <div style={{ fontSize: 11.5, color: tokens.inkSoft, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                      ресурс до капремонта: {Math.round(e.overhaulMileageKm.min / 1000)}–{Math.round(e.overhaulMileageKm.max / 1000)} тыс. км
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600, color: tokens.red }}>{e.horsePower} л.с.</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            {[...r.specs.bodyTypes, ...r.specs.driveTypes].map((b) => (
              <span key={b} style={{ fontSize: 12, border: `1px solid ${tokens.line}`, borderRadius: 20, padding: '4px 10px', color: tokens.inkSoft }}>{b}</span>
            ))}
          </div>
        </Card>
      </section>

      <section style={{ marginBottom: 36 }}>
        <SectionHeader n="02" title="Типичные проблемы" />
        {r.problems.byEngine.map((group) => (
          <div key={group.engine} style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: tokens.inkSoft, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Мотор {group.engine}
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {group.commonIssues.map((issue) => {
                const sev = SEVERITY[issue.severity];
                return (
                  <div key={issue.title} className="ak-issue" style={{ '--sev-color': sev.color, '--sev-bg': sev.bg }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                      <strong style={{ fontSize: 14.5 }}>{issue.title}</strong>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: sev.color, whiteSpace: 'nowrap' }}>{sev.label}</span>
                    </div>
                    <p style={{ fontSize: 13.5, color: tokens.inkSoft, margin: 0, lineHeight: 1.5 }}>{issue.description}</p>
                    {issue.mileageOrAgeHint && (
                      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: tokens.inkSoft, margin: '6px 0 0' }}>⌁ обычно на {issue.mileageOrAgeHint}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section style={{ marginBottom: 36 }}>
        <SectionHeader n="03" title="Расходы в год" />
        <Card style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: tokens.inkSoft, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Топливо</div>
            <RangeBar min={r.costs.fuelPerYearRub.min} max={r.costs.fuelPerYearRub.max} value={r.costs.fuelPerYearRub.max} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: tokens.inkSoft, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>ТО и запчасти</div>
            <RangeBar min={r.costs.maintenancePerYearRub.min} max={r.costs.maintenancePerYearRub.max} value={r.costs.maintenancePerYearRub.max} />
          </div>
          <div style={{ gridColumn: '1 / -1', paddingTop: 12, borderTop: `1px dashed ${tokens.line}` }}>
            <span style={{ fontSize: 12, color: tokens.inkSoft }}>
              Доступность запчастей: <strong style={{ color: tokens.ink }}>{PARTS_LABEL[r.costs.partsAvailability]}</strong>. {r.costs.partsNote}
            </span>
          </div>
        </Card>
      </section>

      <section style={{ marginBottom: 36 }}>
        <SectionHeader n="04" title="Страховка и налог" />
        <Card style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: tokens.inkSoft, marginBottom: 4 }}>ОСАГО / год</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 17, fontWeight: 600 }}>{fmtRub(r.insurance.osagoPerYearRub.min)} – {fmtRub(r.insurance.osagoPerYearRub.max)}</div>
          </div>
          {r.insurance.kaskoPerYearRub && (
            <div>
              <div style={{ fontSize: 12, color: tokens.inkSoft, marginBottom: 4 }}>КАСКО / год</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 17, fontWeight: 600 }}>{fmtRub(r.insurance.kaskoPerYearRub.min)} – {fmtRub(r.insurance.kaskoPerYearRub.max)}</div>
            </div>
          )}
          <div style={{ gridColumn: '1 / -1', fontSize: 12.5, color: tokens.inkSoft, paddingTop: 12, borderTop: `1px dashed ${tokens.line}` }}>
            {r.insurance.transportTaxNote}
          </div>
        </Card>
      </section>

      <section style={{ marginBottom: 36 }}>
        <SectionHeader n="05" title="Цена на рынке" />
        <Card>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 34, fontWeight: 600, color: tokens.red }}>{fmtRub(r.price.marketPriceRub.median)}</div>
            <div style={{ fontSize: 13, color: tokens.inkSoft }}>медиана · диапазон {fmtRub(r.price.marketPriceRub.min)} – {fmtRub(r.price.marketPriceRub.max)}</div>
          </div>
          <RangeBar min={r.price.marketPriceRub.min} max={r.price.marketPriceRub.max} value={r.price.marketPriceRub.median} />
          <p style={{ fontSize: 12.5, color: tokens.inkSoft, marginTop: 14 }}>По состоянию на {r.price.asOfDate}. {r.price.depreciationNote}</p>
        </Card>
      </section>

      <section style={{ marginBottom: 40 }}>
        <SectionHeader n="06" title="Чек-лист перед покупкой" />
        <Card>
          <div style={{ display: 'grid', gap: 10 }}>
            {r.checklistBeforeBuying.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: tokens.red, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, marginTop: 1 }}>0{i + 1}</span>
                <span style={{ fontSize: 14 }}>{item}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={addedToCompare}
          onClick={() => {
            addToCart({ ...car, title: `${car.brand} ${car.model} ${car.yearFrom}` });
            setAddedToCompare(true);
          }}
          className="ak-focus ak-cta"
          style={{ fontFamily: "'Anton', sans-serif", fontSize: 15, letterSpacing: '0.02em', padding: '13px 22px', borderRadius: 8, border: 'none', background: addedToCompare ? tokens.line : tokens.red, color: '#fff', cursor: addedToCompare ? 'default' : 'pointer' }}
        >
          {addedToCompare ? '✓ ДОБАВЛЕНО В СРАВНЕНИЕ' : 'ДОБАВИТЬ К СРАВНЕНИЮ'}
        </button>
        {addedToCompare && (
          <a href="/compare" className="ak-focus" style={{ fontFamily: "'Anton', sans-serif", fontSize: 15, letterSpacing: '0.02em', padding: '13px 22px', borderRadius: 8, border: `1px solid ${tokens.line}`, color: tokens.ink, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            ПЕРЕЙТИ К СРАВНЕНИЮ →
          </a>
        )}
      </div>

      <div style={{ marginTop: 32 }}>
        <FeedbackWidget userId={userId} carVariantId={state.data.carVariantId} />
      </div>
    </>,
  );
}

export default function ReportView() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0B0C0E' }} />}>
      <ReportContent />
    </Suspense>
  );
}
