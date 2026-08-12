'use client';

import React, { useEffect, useState } from 'react';
import { tokens } from '../../lib/tokens';
import { api } from '../../lib/api';
import { ensureUserId, getAuthToken, getUserEmail, isLoggedIn, persistSession, logout } from '../../lib/session';
import SiteFooter from '../../components/SiteFooter';
import SiteHeader from '../../components/SiteHeader';
import FeedbackWidget from '../../components/FeedbackWidget';

const PACKAGES = [
  { id: 'p1', reports: 1, price: 79 },
  { id: 'p5', reports: 5, price: 395 },
];

function Card({ children, style }) {
  return <div style={{ background: tokens.surface, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: 18, ...style }}>{children}</div>;
}

function ListRow({ title, meta, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px dashed ${tokens.line}` }}>
      <div>
        <div style={{ fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 12, color: tokens.inkSoft, marginTop: 2 }}>{meta}</div>
      </div>
      {right}
    </div>
  );
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function GuideSection({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h4 style={{ fontFamily: "'Anton', sans-serif", fontSize: 14, letterSpacing: '0.02em', margin: '0 0 10px', color: tokens.red }}>{title}</h4>
      <div style={{ fontSize: 13.5, lineHeight: 1.7, color: tokens.inkSoft }}>{children}</div>
    </div>
  );
}

function BuyerGuide() {
  return (
    <Card>
      <p style={{ fontSize: 13, color: tokens.inkSoft, marginBottom: 20 }}>
        Памятка для тех, кто покупает или продаёт автомобиль впервые. Отчёты сервиса дополняют
        это — сами по себе не заменяют осмотр и диагностику.
      </p>

      <GuideSection title="ДКП — договор купли-продажи">
        <p>Обязательно должен содержать: ФИО и паспортные данные обеих сторон; данные автомобиля (марка, модель, VIN, гос. номер, год выпуска); цену; дату и место составления; подписи сторон.</p>
        <p style={{ marginTop: 8 }}>Можно написать от руки в свободной форме или использовать типовой бланк — юридическую силу это не меняет. Один экземпляр остаётся у каждой стороны, нужен для постановки на учёт в ГИБДД.</p>
      </GuideSection>

      <GuideSection title="Что проверить при осмотре">
        <p>Кузов — сколы, следы недавней покраски (разнотон, неровные зазоры между панелями), ржавчина в арках и порогах.</p>
        <p style={{ marginTop: 8 }}>Двигатель — подтёки масла, цвет выхлопа на холодном запуске, посторонние стуки.</p>
        <p style={{ marginTop: 8 }}>VIN и номера агрегатов — сверить с указанными в ПТС/СТС, не должно быть следов перебивки.</p>
        <p style={{ marginTop: 8 }}>История — проверить на Госуслугах или через ГИБДД: залог, участие в ДТП, ограничения, количество предыдущих владельцев.</p>
        <p style={{ marginTop: 8 }}>Перед покупкой — обязательна диагностика на независимом СТО, не у продавца.</p>
      </GuideSection>

      <GuideSection title="Как понять рыночную цену">
        <p>Сравни несколько актуальных объявлений на авито/дром для машин того же года, пробега и региона — не ориентируйся на одно объявление.</p>
        <p style={{ marginTop: 8 }}>Учитывай, что цена в объявлении обычно чуть выше той, за которую реально продают — торг закладывается заранее.</p>
        <p style={{ marginTop: 8 }}>Медиана в наших отчётах — это ориентир по рынку в целом, а не цена конкретного экземпляра: состояние, комплектация и торг всё равно двигают её в ту или иную сторону.</p>
      </GuideSection>
    </Card>
  );
}

function SettingsTab({ userId }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentEmail, setCurrentEmail] = useState(null);
  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setCurrentEmail(getUserEmail());
  }, []);
  const [emailField, setEmailField] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState(null);

  if (!loggedIn) {
    return (
      <Card>
        <p style={{ fontSize: 14, color: tokens.inkSoft, marginBottom: 14 }}>
          Сейчас доступ гостевой — без email и пароля. Зарегистрируйся, чтобы не потерять баланс и историю при смене устройства.
        </p>
        <a
          href="/login"
          style={{ display: 'inline-block', fontFamily: "'Anton', sans-serif", fontSize: 14, padding: '11px 18px', borderRadius: 8, background: tokens.red, color: '#fff', textDecoration: 'none' }}
        >
          ВОЙТИ ИЛИ ЗАРЕГИСТРИРОВАТЬСЯ
        </a>
      </Card>
    );
  }

  async function handleChangeEmail(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.changeEmail(getAuthToken(), emailField);
      persistSession({ userId, token: getAuthToken(), email: emailField });
      setMsg({ type: 'ok', text: 'Email обновлён' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.changePassword(getAuthToken(), currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setMsg({ type: 'ok', text: 'Пароль обновлён' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  }

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 6, border: `1px solid ${tokens.line}`, background: '#1C1F24', color: tokens.ink, fontFamily: "'Inter', sans-serif", fontSize: 14, marginBottom: 10 };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {msg && <p style={{ color: msg.type === 'ok' ? tokens.ink : tokens.red, fontSize: 13 }}>{msg.text}</p>}

      <Card>
        <h3 style={{ fontFamily: "'Anton', sans-serif", fontSize: 15, margin: '0 0 12px', color: tokens.ink }}>ПОЧТА</h3>
        <p style={{ fontSize: 12.5, color: tokens.inkSoft, marginBottom: 10 }}>Сейчас: {currentEmail || '—'}</p>
        <form onSubmit={handleChangeEmail}>
          <input type="email" required placeholder="Новый email" value={emailField} onChange={(e) => setEmailField(e.target.value)} style={inputStyle} />
          <button type="submit" style={{ fontFamily: "'Anton', sans-serif", fontSize: 13, padding: '9px 16px', borderRadius: 6, border: 'none', background: tokens.line, color: tokens.ink, cursor: 'pointer' }}>
            СОХРАНИТЬ EMAIL
          </button>
        </form>
      </Card>

      <Card>
        <h3 style={{ fontFamily: "'Anton', sans-serif", fontSize: 15, margin: '0 0 12px', color: tokens.ink }}>ПАРОЛЬ</h3>
        <form onSubmit={handleChangePassword}>
          <input type="password" required placeholder="Текущий пароль" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} />
          <input type="password" required minLength={8} placeholder="Новый пароль (от 8 символов)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} />
          <button type="submit" style={{ fontFamily: "'Anton', sans-serif", fontSize: 13, padding: '9px 16px', borderRadius: 6, border: 'none', background: tokens.line, color: tokens.ink, cursor: 'pointer' }}>
            СМЕНИТЬ ПАРОЛЬ
          </button>
        </form>
      </Card>

      <button
        type="button"
        onClick={() => { logout(); window.location.reload(); }}
        style={{ justifySelf: 'start', fontSize: 13, color: tokens.inkSoft, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
      >
        Выйти из аккаунта
      </button>
    </div>
  );
}

export default function AccountPage() {
  const [userId, setUserId] = useState(null);
  const [tab, setTab] = useState('reports');
  const [balance, setBalance] = useState(null);
  const [reports, setReports] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const uid = await ensureUserId(api);
      if (cancelled) return;
      setUserId(uid);
      const [user, r, c, t] = await Promise.all([
        api.getUser(uid),
        api.getUserReports(uid),
        api.getUserComparisons(uid),
        api.getUserTransactions(uid),
      ]);
      if (cancelled) return;
      setBalance(user.balanceKopeks);
      setReports(r);
      setComparisons(c);
      setTransactions(t);
      setLoading(false);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const TABS = [
    { id: 'reports', label: 'Отчёты', count: reports.length },
    { id: 'comparisons', label: 'Сравнения', count: comparisons.length },
    { id: 'transactions', label: 'Платежи', count: transactions.length },
    { id: 'guide', label: 'Памятка' },
    { id: 'settings', label: 'Настройки' },
  ];

  async function handleTopup(pkg) {
    if (!userId) return;
    const res = await api.topup(userId, pkg.price * 100);
    if (res.confirmationUrl) window.location.href = res.confirmationUrl;
  }

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${tokens.bgGradientTop} 0%, ${tokens.bg} 380px)`, color: tokens.ink, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .ak-link { color: ${tokens.inkSoft}; text-decoration: none; font-size: 13px; }
        .ak-link:hover { color: ${tokens.ink}; }
        .ak-pkg { transition: border-color 0.15s ease, background 0.15s ease; cursor: pointer; }
        .ak-pkg:hover { border-color: ${tokens.red} !important; background: ${tokens.redSoft} !important; }
        .ak-focus:focus-visible { outline: 2px solid ${tokens.blue}; outline-offset: 2px; }
      `}</style>

      <SiteHeader maxWidth={880} />

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '0 24px 60px' }}>
        <h1 style={{ fontFamily: "'Anton', sans-serif", fontSize: 'clamp(28px, 4.5vw, 42px)', margin: '0 0 24px' }}>ЛИЧНЫЙ КАБИНЕТ</h1>

        {loading ? (
          <p style={{ color: tokens.inkSoft, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>ЗАГРУЖАЕМ…</p>
        ) : (
          <>
            <Card style={{ marginBottom: 28, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, color: tokens.inkSoft, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Баланс</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 36, fontWeight: 600, color: tokens.red }}>{Math.round(balance / 100)} ₽</div>
                <div style={{ fontSize: 12, color: tokens.inkSoft, marginTop: 4 }}>≈ {Math.floor(balance / 7900)} отчёта по текущей цене</div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {PACKAGES.map((p) => (
                  <div key={p.id} className="ak-pkg ak-focus" tabIndex={0} role="button" onClick={() => handleTopup(p)}
                    style={{ border: `1px solid ${tokens.line}`, borderRadius: 8, padding: '12px 16px', textAlign: 'center', minWidth: 110 }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 17 }}>{p.price} ₽</div>
                    <div style={{ fontSize: 11.5, color: tokens.inkSoft, marginTop: 2 }}>{p.reports} {p.reports === 1 ? 'отчёт' : 'отчётов'}</div>
                  </div>
                ))}
              </div>
            </Card>

            {getUserEmail() && getUserEmail() === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
              <a
                href="/admin"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none',
                  background: tokens.amberSoft, border: `1px solid ${tokens.amber}`, borderRadius: 10, padding: '14px 18px', marginBottom: 28,
                }}
              >
                <span style={{ fontFamily: "'Anton', sans-serif", fontSize: 14, color: tokens.amber, letterSpacing: '0.02em' }}>
                  ЭТО АДМИНСКИЙ АККАУНТ — ПЕРЕЙТИ В АДМИН-ПАНЕЛЬ
                </span>
                <span style={{ color: tokens.amber }}>→</span>
              </a>
            )}

            <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${tokens.line}`, marginBottom: 20, flexWrap: 'wrap' }}>
              {TABS.map((t) => (
                <button key={t.id} type="button" onClick={() => setTab(t.id)} className="ak-focus"
                  style={{ background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? tokens.red : 'transparent'}`, color: tab === t.id ? tokens.ink : tokens.inkSoft, fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: tab === t.id ? 600 : 400, padding: '10px 14px', cursor: 'pointer' }}>
                  {t.label} {t.count !== undefined && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: tokens.inkSoft }}>({t.count})</span>}
                </button>
              ))}
            </div>

            {tab === 'reports' && (
              <Card>
                {reports.length === 0 && <p style={{ color: tokens.inkSoft, fontSize: 14 }}>Пока пусто — купленные отчёты появятся здесь.</p>}
                {reports.map((r) => (
                  <ListRow
                    key={r.id}
                    title={`${r.carVariant.brand} ${r.carVariant.model} ${r.carVariant.yearFrom}`}
                    meta={formatDate(r.purchasedAt)}
                    right={<a href={`/report?brand=${r.carVariant.brand}&model=${r.carVariant.model}&yearFrom=${r.carVariant.yearFrom}`} className="ak-link" style={{ color: tokens.red }}>Открыть →</a>}
                  />
                ))}
              </Card>
            )}

            {tab === 'comparisons' && (
              <Card>
                {comparisons.length === 0 && <p style={{ color: tokens.inkSoft, fontSize: 14 }}>Пока пусто — сравнения появятся здесь.</p>}
                {comparisons.map((c) => (
                  <ListRow key={c.id} title={`Сравнение ${c.carVariantIds.length} машин`} meta={formatDate(c.createdAt)} right={null} />
                ))}
              </Card>
            )}

            {tab === 'transactions' && (
              <Card>
                {transactions.length === 0 && <p style={{ color: tokens.inkSoft, fontSize: 14 }}>Пока пусто.</p>}
                {transactions.map((t) => (
                  <ListRow
                    key={t.id}
                    title={t.type === 'TOPUP' ? 'Пополнение' : t.type === 'REPORT_PURCHASE' ? 'Покупка отчёта' : t.type}
                    meta={formatDate(t.createdAt)}
                    right={<span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 600 }}>{t.type === 'TOPUP' ? '+' : '-'}{Math.round(t.amountKopeks / 100)} ₽</span>}
                  />
                ))}
              </Card>
            )}

            {tab === 'guide' && <BuyerGuide />}
            {tab === 'settings' && <SettingsTab userId={userId} />}

            <div style={{ marginTop: 24 }}>
              <FeedbackWidget userId={userId} />
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
