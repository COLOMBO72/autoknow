'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { tokens } from '../../lib/tokens';
import { api } from '../../lib/api';
import { persistSession, getGuestUserId } from '../../lib/session';
import SiteFooter from '../../components/SiteFooter';

const inputStyle = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: 6,
  border: `1px solid ${tokens.line}`,
  background: '#1C1F24',
  color: tokens.ink,
  fontFamily: "'Inter', sans-serif",
  fontSize: 15,
  marginBottom: 12,
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register(email, password, getGuestUserId() || undefined);
      persistSession({ userId: result.userId, token: result.token, email });
      router.push('/account');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${tokens.bgGradientTop} 0%, ${tokens.bg} 380px)`, color: tokens.ink, fontFamily: "'Inter', sans-serif" }}>
      <header style={{ maxWidth: 440, margin: '0 auto', padding: '20px 24px' }}>
        <a href="/" style={{ fontFamily: "'Anton', sans-serif", fontSize: 22, letterSpacing: '0.03em', textDecoration: 'none', color: tokens.ink }}>
          AUTO<span style={{ color: tokens.red }}>KNOW</span>
        </a>
      </header>

      <main style={{ maxWidth: 440, margin: '40px auto 0', padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${tokens.line}`, marginBottom: 24 }}>
          {[
            { id: 'login', label: 'Вход' },
            { id: 'register', label: 'Регистрация' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              style={{
                background: 'none', border: 'none', borderBottom: `2px solid ${mode === t.id ? tokens.red : 'transparent'}`,
                color: mode === t.id ? tokens.ink : tokens.inkSoft, fontFamily: "'Inter', sans-serif", fontSize: 15,
                fontWeight: mode === t.id ? 600 : 400, padding: '10px 14px', cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
          <input type="password" required minLength={8} placeholder="Пароль (от 8 символов)" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />

          {error && <p style={{ color: tokens.red, fontSize: 13, marginBottom: 12 }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', fontFamily: "'Anton', sans-serif", fontSize: 16, padding: '13px 16px', borderRadius: 8, border: 'none', background: tokens.red, color: '#fff', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'СЕКУНДУ…' : mode === 'login' ? 'ВОЙТИ' : 'ЗАРЕГИСТРИРОВАТЬСЯ'}
          </button>
        </form>

        {mode === 'login' && (
          <p style={{ marginTop: 14, textAlign: 'center' }}>
            <a href="/forgot-password" style={{ color: tokens.inkSoft, fontSize: 13 }}>Забыли пароль?</a>
          </p>
        )}
        {mode === 'register' && (
          <p style={{ marginTop: 14, fontSize: 12, color: tokens.inkSoft, textAlign: 'center' }}>
            Если вы уже пользовались сайтом без регистрации — ваш баланс и история сохранятся.
          </p>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
