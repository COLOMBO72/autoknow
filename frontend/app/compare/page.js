'use client';

import React, { useEffect, useState } from 'react';
import { tokens, fmtRub } from '../../lib/tokens';
import { api } from '../../lib/api';
import { ensureUserId } from '../../lib/session';
import { getCart, removeFromCart } from '../../lib/compareCart';
import SiteFooter from '../../components/SiteFooter';

const PARTS_RANK = { excellent: 3, good: 2, limited: 1, poor: 0 };
const PARTS_LABEL = { excellent: 'отличная', good: 'хорошая', limited: 'ограниченная', poor: 'слабая' };

const ROWS = [
  { label: 'Цена (медиана)', better: 'lower', value: (c) => c.report.price.marketPriceRub.median, display: (c) => fmtRub(c.report.price.marketPriceRub.median) },
  { label: 'Двигатель', value: null, display: (c) => c.report.specs.engines[0]?.name ?? '—' },
  {
    label: 'Топливо + ТО / год (макс.)',
    better: 'lower',
    value: (c) => c.report.costs.fuelPerYearRub.max + c.report.costs.maintenancePerYearRub.max,
    display: (c) => fmtRub(c.report.costs.fuelPerYearRub.max + c.report.costs.maintenancePerYearRub.max),
  },
  { label: 'ОСАГО / год (макс.)', better: 'lower', value: (c) => c.report.insurance.osagoPerYearRub.max, display: (c) => fmtRub(c.report.insurance.osagoPerYearRub.max) },
  { label: 'Доступность запчастей', better: 'higher', value: (c) => PARTS_RANK[c.report.costs.partsAvailability], display: (c) => PARTS_LABEL[c.report.costs.partsAvailability] },
  {
    label: 'Критичных проблем',
    better: 'lower',
    value: (c) => c.report.problems.byEngine.reduce((sum, g) => sum + g.commonIssues.filter((i) => i.severity === 'critical').length, 0),
    display: (c) => c.report.problems.byEngine.reduce((sum, g) => sum + g.commonIssues.filter((i) => i.severity === 'critical').length, 0),
  },
];

function bestIndex(row, cars) {
  if (!row.value) return -1;
  const values = cars.map(row.value);
  const target = row.better === 'lower' ? Math.min(...values) : Math.max(...values);
  return values.indexOf(target);
}

export default function ComparePage() {
  const [cartCars, setCartCars] = useState([]);
  const [state, setState] = useState({ loading: true, error: null, results: [] });

  useEffect(() => {
    setCartCars(getCart());
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (cartCars.length < 2) {
        setState({ loading: false, error: null, results: [] });
        return;
      }
      setState({ loading: true, error: null, results: [] });
      try {
        const userId = await ensureUserId(api);
        const res = await api.compareReports(userId, cartCars);
        if (!cancelled) setState({ loading: false, error: null, results: res.comparisons });
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: err.message, results: [] });
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [cartCars]);

  function handleRemove(index) {
    setCartCars(removeFromCart(index));
  }

  const shell = (children) => (
    <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${tokens.bgGradientTop} 0%, ${tokens.bg} 380px)`, color: tokens.ink, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .ak-link { color: ${tokens.inkSoft}; text-decoration: none; font-size: 13px; }
        .ak-link:hover { color: ${tokens.ink}; }
        .ak-remove { transition: color 0.15s ease; }
        .ak-remove:hover { color: ${tokens.red} !important; }
        .ak-scroll { overflow-x: auto; padding-bottom: 4px; }
        .ak-scroll::-webkit-scrollbar { height: 6px; }
        .ak-scroll::-webkit-scrollbar-thumb { background: ${tokens.line}; border-radius: 3px; }
        .ak-focus:focus-visible { outline: 2px solid ${tokens.blue}; outline-offset: 2px; }
      `}</style>
      <header style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ fontFamily: "'Anton', sans-serif", fontSize: 22, letterSpacing: '0.03em', textDecoration: 'none', color: tokens.ink }}>
          AUTO<span style={{ color: tokens.red }}>KNOW</span>
        </a>
        <a href="/account" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: tokens.inkSoft, border: `1px solid ${tokens.line}`, borderRadius: 20, padding: '7px 14px', textDecoration: 'none' }}>
          КАБИНЕТ
        </a>
      </header>
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 60px' }}>{children}</main>
      <SiteFooter />
    </div>
  );

  if (cartCars.length < 2) {
    return shell(
      <div style={{ padding: '40px 0' }}>
        <h1 style={{ fontFamily: "'Anton', sans-serif", fontSize: 32, margin: '0 0 12px' }}>СРАВНЕНИЕ</h1>
        <p style={{ color: tokens.inkSoft, marginBottom: 16 }}>
          Добавь минимум 2 машины к сравнению со страницы отчёта — кнопка «Добавить к сравнению».
        </p>
        <a href="/" className="ak-link">← К выбору машины</a>
      </div>,
    );
  }

  if (state.loading) {
    return shell(<div style={{ padding: '60px 0', textAlign: 'center', color: tokens.inkSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>СОБИРАЕМ СРАВНЕНИЕ…</div>);
  }

  if (state.error) {
    return shell(<p style={{ color: tokens.red, padding: '40px 0' }}>Ошибка: {state.error}</p>);
  }

  const cars = state.results;

  return shell(
    <>
      <a href="/" className="ak-link" style={{ display: 'inline-block', margin: '20px 0 16px' }}>← Назад к выбору</a>
      <h1 style={{ fontFamily: "'Anton', sans-serif", fontSize: 'clamp(28px, 4.5vw, 42px)', margin: '0 0 6px' }}>СРАВНЕНИЕ</h1>
      <p style={{ fontSize: 14, color: tokens.inkSoft, margin: '0 0 28px' }}>{cars.length} машины · до 5 в одном сравнении</p>

      <div className="ak-scroll">
        <div style={{ display: 'grid', gridTemplateColumns: `180px repeat(${cars.length}, minmax(180px, 1fr))`, minWidth: 180 + cars.length * 180, gap: 10 }}>
          <div />
          {cars.map((c, i) => (
            <div key={i} style={{ background: tokens.surface, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: 16, position: 'relative' }}>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="ak-remove ak-focus"
                style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', color: tokens.inkSoft, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                aria-label="Убрать из сравнения"
              >
                ×
              </button>
              <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 16, letterSpacing: '0.01em', marginBottom: 4, paddingRight: 16 }}>
                {cartCars[i]?.title ?? `${cartCars[i]?.brand} ${cartCars[i]?.model}`}
              </div>
              {!c.alreadyOwned && <div style={{ marginTop: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: tokens.red }}>+30 ₽ — списано сейчас</div>}
            </div>
          ))}

          {ROWS.map((row) => {
            const winner = bestIndex(row, cars);
            return (
              <React.Fragment key={row.label}>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: 12.5, color: tokens.inkSoft, padding: '10px 0' }}>{row.label}</div>
                {cars.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', borderRadius: 6,
                      background: i === winner ? 'rgba(230,57,43,0.08)' : 'transparent',
                      border: i === winner ? `1px solid ${tokens.redSoft}` : '1px solid transparent',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 13.5, fontWeight: i === winner ? 600 : 400,
                    }}
                  >
                    {row.display(c)}
                    {i === winner && <span style={{ color: tokens.red, fontSize: 11 }}>★</span>}
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </>,
  );
}
