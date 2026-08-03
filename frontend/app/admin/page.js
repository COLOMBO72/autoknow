'use client';

import React, { useEffect, useState } from 'react';
import { tokens, fmtRub } from '../../lib/tokens';
import { api } from '../../lib/api';
import { getAuthToken, isLoggedIn } from '../../lib/session';

function Card({ children, style }) {
  return <div style={{ background: tokens.surface, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: 18, ...style }}>{children}</div>;
}

function StatBlock({ label, value }) {
  return (
    <Card>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: 12, color: tokens.inkSoft, marginTop: 4 }}>{label}</div>
    </Card>
  );
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('ru-RU');
}

export default function AdminPage() {
  const [access, setAccess] = useState('checking'); // checking | denied | ok
  const [stats, setStats] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [aiHealth, setAiHealth] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [topupEmail, setTopupEmail] = useState('');
  const [topupAmount, setTopupAmount] = useState('300');
  const [topupMsg, setTopupMsg] = useState(null);

  async function loadAll() {
    const token = getAuthToken();
    try {
      const [s, p, h, f] = await Promise.all([
        api.getAdminStats(token),
        api.getAdminRecentPurchases(token, 30),
        api.getAdminAiHealth(token),
        api.getAdminFeedback(token, 20),
      ]);
      setStats(s);
      setPurchases(p);
      setAiHealth(h);
      setFeedback(f);
      setAccess('ok');
    } catch (err) {
      setAccess(err.status === 403 ? 'denied' : 'error');
    }
  }

  useEffect(() => {
    if (!isLoggedIn()) {
      setAccess('denied');
      return;
    }
    loadAll();
    const interval = setInterval(loadAll, 8000); // "живая" лента без вебсокетов — просто опрос раз в 8 сек
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleTopup(e) {
    e.preventDefault();
    setTopupMsg(null);
    try {
      await api.adminTopupByEmail(getAuthToken(), topupEmail, Math.round(Number(topupAmount) * 100));
      setTopupMsg({ type: 'ok', text: `Начислено ${topupAmount} ₽ на ${topupEmail}` });
      setTopupEmail('');
      loadAll();
    } catch (err) {
      setTopupMsg({ type: 'error', text: err.message });
    }
  }

  if (access === 'checking') {
    return <div style={{ minHeight: '100vh', background: tokens.bg }} />;
  }

  if (access === 'denied' || access === 'error') {
    return (
      <div style={{ minHeight: '100vh', background: tokens.bg, color: tokens.ink, fontFamily: "'Inter', sans-serif", padding: 40, textAlign: 'center' }}>
        <p style={{ marginBottom: 16 }}>Нет доступа. Войди под аккаунтом администратора.</p>
        <a href="/login" style={{ color: tokens.red }}>Войти →</a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${tokens.bgGradientTop} 0%, ${tokens.bg} 380px)`, color: tokens.ink, fontFamily: "'Inter', sans-serif" }}>
      <header style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: "'Anton', sans-serif", fontSize: 22, letterSpacing: '0.03em' }}>
          AUTO<span style={{ color: tokens.red }}>KNOW</span> · ADMIN
        </span>
        <a href="/" style={{ color: tokens.inkSoft, fontSize: 13, textDecoration: 'none' }}>← На сайт</a>
      </header>

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 60px', display: 'grid', gap: 28 }}>
        {/* Основные цифры */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <StatBlock label="Пользователей всего" value={stats.totalUsers} />
          <StatBlock label="Новых за 7 дней" value={stats.newUsersLast7Days} />
          <StatBlock label="Отчётов куплено" value={stats.totalReportsPurchased} />
          <StatBlock label="Сравнений" value={stats.totalComparisons} />
          <StatBlock label="Уникальных AI-генераций" value={stats.uniqueCarVariantsGenerated} />
          <StatBlock label="Экономия на кэше" value={`${stats.cacheSavingsPct}%`} />
          <StatBlock label="Пополнено всего" value={fmtRub(stats.totalRevenueKopeks / 100)} />
          <StatBlock label="Обращений в поддержку" value={stats.feedbackCount} />
        </div>

        {/* Топ марок */}
        <Card>
          <h3 style={{ fontFamily: "'Anton', sans-serif", fontSize: 16, margin: '0 0 12px' }}>ТОП МАРОК ПО ЗАПРОСАМ</h3>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {stats.topBrands.map((b) => (
              <div key={b.brand} style={{ fontSize: 13 }}>
                <strong style={{ textTransform: 'capitalize' }}>{b.brand}</strong>{' '}
                <span style={{ color: tokens.inkSoft, fontFamily: "'JetBrains Mono', monospace" }}>({b.count})</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Здоровье AI-провайдера */}
        <Card>
          <h3 style={{ fontFamily: "'Anton', sans-serif", fontSize: 16, margin: '0 0 12px' }}>ЗДОРОВЬЕ AI (24 ЧАСА)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: aiHealth.recentErrors.length ? 16 : 0 }}>
            <div>
              <div style={{ fontSize: 12, color: tokens.inkSoft, marginBottom: 4 }}>Primary (AITunnel)</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, color: aiHealth.primary.successRatePct === null || aiHealth.primary.successRatePct >= 95 ? tokens.ink : tokens.red }}>
                {aiHealth.primary.successRatePct === null ? '—' : `${aiHealth.primary.successRatePct}%`} <span style={{ fontSize: 12, color: tokens.inkSoft }}>({aiHealth.primary.total} вызовов)</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: tokens.inkSoft, marginBottom: 4 }}>Fallback</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600 }}>
                {aiHealth.fallback.successRatePct === null ? '—' : `${aiHealth.fallback.successRatePct}%`} <span style={{ fontSize: 12, color: tokens.inkSoft }}>({aiHealth.fallback.total} вызовов)</span>
              </div>
            </div>
          </div>
          {aiHealth.primary.successRatePct !== null && aiHealth.primary.successRatePct < 90 && (
            <p style={{ fontSize: 12.5, color: tokens.red, marginBottom: 12 }}>
              Primary-провайдер даёт много ошибок за последние сутки — возможно, пора переключить AI_BASE_URL на другой агрегатор.
            </p>
          )}
          {aiHealth.recentErrors.map((e, i) => (
            <div key={i} style={{ fontSize: 12, color: tokens.inkSoft, borderTop: `1px dashed ${tokens.line}`, padding: '8px 0' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatDateTime(e.at)}</span> · {e.provider}/{e.model} — {e.message}
            </div>
          ))}
        </Card>

        {/* Пополнение по email */}
        <Card>
          <h3 style={{ fontFamily: "'Anton', sans-serif", fontSize: 16, margin: '0 0 12px' }}>ПОПОЛНИТЬ БАЛАНС ПО EMAIL</h3>
          <form onSubmit={handleTopup} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <input
              type="email" required placeholder="email@example.com" value={topupEmail} onChange={(e) => setTopupEmail(e.target.value)}
              style={{ flex: 1, minWidth: 200, padding: '10px 12px', borderRadius: 6, border: `1px solid ${tokens.line}`, background: '#1C1F24', color: tokens.ink, fontFamily: "'Inter', sans-serif", fontSize: 14 }}
            />
            <input
              type="number" required min="1" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)}
              style={{ width: 100, padding: '10px 12px', borderRadius: 6, border: `1px solid ${tokens.line}`, background: '#1C1F24', color: tokens.ink, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}
            />
            <button type="submit" style={{ fontFamily: "'Anton', sans-serif", fontSize: 13, padding: '10px 18px', borderRadius: 6, border: 'none', background: tokens.red, color: '#fff', cursor: 'pointer' }}>
              НАЧИСЛИТЬ ₽
            </button>
          </form>
          {topupMsg && <p style={{ marginTop: 10, fontSize: 13, color: topupMsg.type === 'ok' ? tokens.ink : tokens.red }}>{topupMsg.text}</p>}
        </Card>

        {/* Лента покупок */}
        <Card>
          <h3 style={{ fontFamily: "'Anton', sans-serif", fontSize: 16, margin: '0 0 12px' }}>ПОСЛЕДНИЕ ПОКУПКИ <span style={{ fontSize: 11, color: tokens.inkSoft, fontFamily: "'Inter', sans-serif" }}>(обновляется каждые 8 сек)</span></h3>
          {purchases.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: `1px dashed ${tokens.line}` }}>
              <span>{p.carVariant.brand} {p.carVariant.model} {p.carVariant.yearFrom} <span style={{ color: tokens.inkSoft }}>— {p.user.email || p.user.telegramId || p.user.id.slice(0, 8)}</span></span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: tokens.inkSoft }}>{formatDateTime(p.purchasedAt)}</span>
            </div>
          ))}
        </Card>

        {/* Обратная связь */}
        <Card>
          <h3 style={{ fontFamily: "'Anton', sans-serif", fontSize: 16, margin: '0 0 12px' }}>ОБРАТНАЯ СВЯЗЬ</h3>
          {feedback.length === 0 && <p style={{ color: tokens.inkSoft, fontSize: 13 }}>Пока пусто.</p>}
          {feedback.map((f) => (
            <div key={f.id} style={{ fontSize: 13, padding: '10px 0', borderBottom: `1px dashed ${tokens.line}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <strong>{f.type}</strong>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: tokens.inkSoft }}>{formatDateTime(f.createdAt)}</span>
              </div>
              <p style={{ margin: 0, color: tokens.inkSoft }}>{f.message}</p>
              {(f.contactInfo || f.user?.email) && <p style={{ margin: '4px 0 0', fontSize: 11.5 }}>контакт: {f.contactInfo || f.user?.email}</p>}
            </div>
          ))}
        </Card>
      </main>
    </div>
  );
}
