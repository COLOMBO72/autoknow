'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { tokens } from '../lib/tokens';
import { api } from '../lib/api';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';

const ANY_VALUE = '__any__';
const YEARS = Array.from({ length: 2024 - 2005 + 1 }, (_, i) => 2024 - i);

function ChipGroup({ label, options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: tokens.inkSoft }}>
        {label}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" onClick={() => onChange(ANY_VALUE)} className="ak-focus" style={chipStyle(value === ANY_VALUE)}>
          Неважно — все варианты
        </button>
        {options.map((opt) => (
          <button key={opt} type="button" onClick={() => onChange(opt)} className="ak-focus" style={chipStyle(value === opt)}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function chipStyle(active) {
  return {
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    padding: '7px 12px',
    borderRadius: 20,
    border: `1px solid ${active ? tokens.red : tokens.line}`,
    background: active ? tokens.redSoft : 'transparent',
    color: active ? tokens.red : tokens.ink,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };
}

function FieldLabel({ children, required }) {
  return (
    <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: tokens.inkSoft, display: 'block', marginBottom: 6 }}>
      {children}
      {required && <span style={{ color: tokens.red }}> *</span>}
    </label>
  );
}

function Select({ value, onChange, children, disabled }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="ak-focus ak-select"
      style={{
        width: '100%',
        fontFamily: "'Inter', sans-serif",
        fontSize: 15,
        padding: '11px 12px',
        borderRadius: 6,
        border: `1px solid ${tokens.line}`,
        background: disabled ? '#101216' : '#1C1F24',
        color: tokens.ink,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </select>
  );
}

function ScanCar() {
  const callouts = [
    { n: 1, label: 'ДВИГАТЕЛЬ', x: 108, y: 88, lx: 40, ly: 20 },
    { n: 2, label: 'БОЛЯЧКИ', x: 300, y: 145, lx: 372, ly: 226 },
    { n: 3, label: 'РАСХОДЫ', x: 320, y: 118, lx: 372, ly: 54 },
    { n: 4, label: 'ЦЕНА', x: 130, y: 169, lx: 40, ly: 230 },
  ];
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', inset: '-20%', background: `radial-gradient(closest-side, ${tokens.redSoft}, transparent 70%)`, filter: 'blur(10px)', pointerEvents: 'none' }} />
      <svg viewBox="0 0 420 260" style={{ width: '100%', height: 'auto', maxWidth: 480, position: 'relative' }}>
        <line x1="20" y1="169" x2="400" y2="169" stroke={tokens.line} strokeWidth="1" strokeDasharray="2 4" />
        <g className="ak-draw">
          <polygon points="50,145 50,110 75,95 150,95 170,50 250,50 275,95 345,95 350,110 350,145" fill="none" stroke={tokens.ink} strokeWidth="1.5" />
          <line x1="50" y1="145" x2="350" y2="145" stroke={tokens.ink} strokeWidth="1.5" />
          <line x1="150" y1="95" x2="170" y2="50" stroke={tokens.ink} strokeWidth="1" />
          <line x1="250" y1="50" x2="230" y2="95" stroke={tokens.ink} strokeWidth="1" />
        </g>
        <circle cx="110" cy="145" r="24" fill="none" stroke={tokens.ink} strokeWidth="1.5" className="ak-wheel" />
        <circle cx="110" cy="145" r="7" fill="none" stroke={tokens.ink} strokeWidth="1" />
        <circle cx="300" cy="145" r="24" fill="none" stroke={tokens.ink} strokeWidth="1.5" className="ak-wheel" style={{ animationDelay: '0.15s' }} />
        <circle cx="300" cy="145" r="7" fill="none" stroke={tokens.ink} strokeWidth="1" />
        {callouts.map((c) => (
          <g key={c.n} className="ak-callout" style={{ animationDelay: `${900 + c.n * 150}ms` }}>
            <circle cx={c.x} cy={c.y} r="4" fill={tokens.red} className="ak-pulse" />
            <line x1={c.x} y1={c.y} x2={c.lx} y2={c.ly} stroke={tokens.red} strokeWidth="1" opacity="0.6" />
            <circle cx={c.lx} cy={c.ly} r="9" fill="#0B0C0E" stroke={tokens.red} strokeWidth="1" />
            <text x={c.lx} y={c.ly + 3} textAnchor="middle" fontFamily="'JetBrains Mono', monospace" fontSize="9" fill={tokens.red}>{c.n}</text>
            <text x={c.lx < 210 ? c.lx + 16 : c.lx - 16} y={c.ly + 3} textAnchor={c.lx < 210 ? 'start' : 'end'} fontFamily="'Anton', sans-serif" fontSize="13" letterSpacing="0.02em" fill={tokens.ink}>{c.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function FreeTextRequest({ router }) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('idle'); // idle | checking | error
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setStatus('checking');
    setError(null);
    try {
      const resolved = await api.resolveFreeText(text.trim());
      const params = new URLSearchParams({ brand: resolved.brand, model: resolved.model, yearFrom: String(resolved.yearFrom) });
      router.push(`/report?${params.toString()}`);
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  return (
    <section style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 50px' }}>
      <div style={{ background: tokens.surface, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: 20 }}>
        <h3 style={{ fontFamily: "'Anton', sans-serif", fontSize: 15, letterSpacing: '0.02em', margin: '0 0 10px', color: tokens.inkSoft }}>
          НЕ НАШЛИ АВТОМОБИЛЬ? НАПИШИТЕ ЗДЕСЬ
        </h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Например "Mazda 6 2015"'
            style={{ flex: 1, minWidth: 200, padding: '11px 14px', borderRadius: 6, border: `1px solid ${tokens.line}`, background: '#1C1F24', color: tokens.ink, fontFamily: "'Inter', sans-serif", fontSize: 14 }}
          />
          <button
            type="submit"
            disabled={status === 'checking' || !text.trim()}
            style={{ fontFamily: "'Anton', sans-serif", fontSize: 13, padding: '11px 20px', borderRadius: 6, border: 'none', background: tokens.red, color: '#fff', cursor: 'pointer', opacity: status === 'checking' || !text.trim() ? 0.6 : 1 }}
          >
            {status === 'checking' ? 'ПРОВЕРЯЕМ…' : 'ПРОВЕРИТЬ'}
          </button>
        </form>
        {error && <p style={{ fontSize: 12.5, color: tokens.amber, marginTop: 10 }}>{error}</p>}
      </div>
    </section>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState({});
  const [catalogError, setCatalogError] = useState(false);

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [generation, setGeneration] = useState(ANY_VALUE);
  const [engine, setEngine] = useState(ANY_VALUE);
  const [bodyType, setBodyType] = useState(ANY_VALUE);

  const [knownVariants, setKnownVariants] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    api.getBrands().then(setCatalog).catch(() => setCatalogError(true));
  }, []);

  const models = brand ? catalog[brand] || [] : [];
  const canRefine = Boolean(brand && model && year);
  const canSubmit = Boolean(brand && model && year) && !submitting;

  useEffect(() => {
    if (!brand || !model) {
      setKnownVariants(null);
      return;
    }
    let cancelled = false;
    api
      .getKnownVariants(brand, model)
      .then((v) => {
        if (!cancelled) setKnownVariants(v);
      })
      .catch(() => {
        if (!cancelled) setKnownVariants({ generations: [], engines: [], bodyTypes: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [brand, model]);

  function handleBrandChange(v) {
    setBrand(v);
    setModel('');
    setGeneration(ANY_VALUE);
    setEngine(ANY_VALUE);
    setBodyType(ANY_VALUE);
  }

  function handleModelChange(v) {
    setModel(v);
    setGeneration(ANY_VALUE);
    setEngine(ANY_VALUE);
    setBodyType(ANY_VALUE);
  }

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const params = new URLSearchParams();
      params.set('brand', brand);
      params.set('model', model);
      params.set('yearFrom', year);
      if (generation !== ANY_VALUE) params.set('generation', generation);
      if (engine !== ANY_VALUE) params.set('engine', engine);
      if (bodyType !== ANY_VALUE) params.set('bodyType', bodyType);
      router.push(`/report?${params.toString()}`);
    } finally {
      setSubmitting(false);
    }
  }

  const hasKnownVariants =
    knownVariants && (knownVariants.generations.length || knownVariants.engines.length || knownVariants.bodyTypes.length);

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${tokens.bgGradientTop} 0%, ${tokens.bg} 380px)`, color: tokens.ink, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @media (max-width: 860px) {
          .ak-hero-grid { grid-template-columns: 1fr !important; }
          .ak-hero-visual { position: static !important; }
        }
        .ak-draw { stroke-dasharray: 1400; stroke-dashoffset: 1400; animation: akDraw 1.4s cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes akDraw { to { stroke-dashoffset: 0; } }
        .ak-wheel { opacity: 0; animation: akFadeScale 0.5s ease forwards 1.1s; transform-origin: center; }
        @keyframes akFadeScale { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
        .ak-callout { opacity: 0; animation: akFadeUp 0.5s ease forwards; }
        @keyframes akFadeUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .ak-pulse { animation: akPulse 2s ease-in-out infinite; }
        @keyframes akPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
        .ak-select:hover:not(:disabled) { border-color: ${tokens.red} !important; }
        button.ak-cta { transition: transform 0.15s ease, box-shadow 0.2s ease; }
        button.ak-cta:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px ${tokens.redSoft}; }
        @media (prefers-reduced-motion: reduce) {
          .ak-draw, .ak-wheel, .ak-callout, .ak-pulse { animation: none !important; opacity: 1 !important; stroke-dashoffset: 0 !important; }
        }
        .ak-focus:focus-visible { outline: 2px solid ${tokens.blue}; outline-offset: 2px; }
      `}</style>

      <SiteHeader />

      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 24px 8px' }}>
        <h1 style={{ fontFamily: "'Anton', sans-serif", fontSize: 'clamp(38px, 6vw, 64px)', lineHeight: 1.02, letterSpacing: '0.01em', margin: '0 0 16px', maxWidth: 780 }}>
          УЗНАЙ, ВО ЧТО ВВЯЗЫВАЕШЬСЯ, <span style={{ color: tokens.red }}>ДО ТОГО КАК ОТДАШЬ ДЕНЬГИ</span>
        </h1>
        <p style={{ fontSize: 16.5, lineHeight: 1.6, color: tokens.inkSoft, maxWidth: 560, margin: '0 0 28px' }}>
          Двигатели, типичные болячки, расходы на год вперёд и честная цена по рынку —
          по любой марке, модели и году. ИИ ищет в интернете и собирает досье за секунды.
        </p>
        {catalogError && (
          <p style={{ fontSize: 13, color: tokens.red, marginBottom: 16 }}>
            Не получилось загрузить список марок — проверь, что бэкенд запущен и NEXT_PUBLIC_API_BASE_URL указывает на него.
          </p>
        )}
      </section>

      <section className="ak-hero-grid" style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 24px 60px', display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.1fr)', gap: 32, alignItems: 'start' }}>
        <div className="ak-hero-visual" style={{ position: 'sticky', top: 24 }}>
          <ScanCar />
        </div>

        <div style={{ background: tokens.surface, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div>
              <FieldLabel required>Марка</FieldLabel>
              <Select value={brand} onChange={handleBrandChange}>
                <option value="">Выбрать…</option>
                {Object.keys(catalog).map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel required>Модель</FieldLabel>
              <Select value={model} onChange={handleModelChange} disabled={!brand}>
                <option value="">{brand ? 'Выбрать…' : 'Сначала марка'}</option>
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel required>Год выпуска</FieldLabel>
              <Select value={year} onChange={setYear} disabled={!model}>
                <option value="">{model ? 'Выбрать…' : 'Сначала модель'}</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </div>
          </div>

          {canRefine && (
            <div style={{ borderTop: `1px dashed ${tokens.line}`, paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.08em', color: tokens.inkSoft }}>
                УТОЧНИТЬ (НЕОБЯЗАТЕЛЬНО)
              </span>
              {hasKnownVariants ? (
                <>
                  {knownVariants.generations.length > 0 && (
                    <ChipGroup label="Поколение" options={knownVariants.generations} value={generation} onChange={setGeneration} />
                  )}
                  {knownVariants.engines.length > 0 && (
                    <ChipGroup label="Двигатель" options={knownVariants.engines} value={engine} onChange={setEngine} />
                  )}
                  {knownVariants.bodyTypes.length > 0 && (
                    <ChipGroup label="Кузов" options={knownVariants.bodyTypes} value={bodyType} onChange={setBodyType} />
                  )}
                </>
              ) : (
                <p style={{ fontSize: 13, color: tokens.inkSoft, margin: 0 }}>
                  Для этой модели пока нет отдельных вариантов в справочнике — отчёт покроет все известные комплектации автоматически.
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="ak-focus ak-cta"
            style={{
              marginTop: 20,
              width: '100%',
              fontFamily: "'Anton', sans-serif",
              fontSize: 17,
              letterSpacing: '0.03em',
              padding: '14px 16px',
              borderRadius: 8,
              border: 'none',
              background: canSubmit ? tokens.red : tokens.line,
              color: '#fff',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {submitting ? 'СЕКУНДУ…' : 'ПОКАЗАТЬ ДОСЬЕ'}
          </button>
          {submitError && <p style={{ color: tokens.red, fontSize: 13, marginTop: 10 }}>{submitError}</p>}
        </div>
      </section>

      {Object.keys(catalog).length > 0 && (
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 40px' }}>
          <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: 18, letterSpacing: '0.02em', margin: '0 0 16px', color: tokens.inkSoft }}>
            ПОПУЛЯРНЫЕ МОДЕЛИ
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(catalog).flatMap(([b, models]) =>
              models.map((m) => (
                <a
                  key={`${b}-${m}`}
                  href={`/report?brand=${encodeURIComponent(b)}&model=${encodeURIComponent(m)}&yearFrom=2021`}
                  style={{ fontSize: 13, color: tokens.inkSoft, border: `1px solid ${tokens.line}`, borderRadius: 20, padding: '6px 12px', textDecoration: 'none' }}
                >
                  {b} {m}
                </a>
              )),
            )}
          </div>
        </section>
      )}

      <FreeTextRequest router={router} />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px' }}>
        <p style={{ fontSize: 12, color: tokens.inkSoft, maxWidth: 640, lineHeight: 1.6 }}>
          Для сравнения нескольких машин каждая машина оплачивается отдельно. Уже купленный отчёт по конкретной машине всегда доступен повторно бесплатно.
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}
