'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { tokens } from '../../lib/tokens';
import { api } from '../../lib/api';
import SiteFooter from '../../components/SiteFooter';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setStatus('sending');
    try {
      await api.resetPassword(email, token, password);
      setStatus('done');
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setError(err.message);
      setStatus('idle');
    }
  }

  if (!token || !email) {
    return (
      <div style={{ minHeight: '100vh', background: tokens.bg, color: tokens.ink, padding: 24, fontFamily: "'Inter', sans-serif" }}>
        <p>Ссылка неполная. <a href="/forgot-password" style={{ color: tokens.red }}>Запросить новую →</a></p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${tokens.bgGradientTop} 0%, ${tokens.bg} 380px)`, color: tokens.ink, fontFamily: "'Inter', sans-serif" }}>
      <header style={{ maxWidth: 440, margin: '0 auto', padding: '20px 24px' }}>
        <a href="/" style={{ fontFamily: "'Anton', sans-serif", fontSize: 22, letterSpacing: '0.03em', textDecoration: 'none', color: tokens.ink }}>
          AUTO<span style={{ color: tokens.red }}>KNOW</span>
        </a>
      </header>
      <main style={{ maxWidth: 440, margin: '40px auto 0', padding: '0 24px' }}>
        <h1 style={{ fontFamily: "'Anton', sans-serif", fontSize: 26, margin: '0 0 16px' }}>НОВЫЙ ПАРОЛЬ</h1>
        {status === 'done' ? (
          <p style={{ color: tokens.ink, fontSize: 14 }}>Пароль обновлён, переходим ко входу…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="password" required minLength={8} placeholder="Новый пароль (от 8 символов)" value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '11px 12px', borderRadius: 6, border: `1px solid ${tokens.line}`, background: '#1C1F24', color: tokens.ink, fontFamily: "'Inter', sans-serif", fontSize: 15, marginBottom: 12 }}
            />
            {error && <p style={{ color: tokens.red, fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button
              type="submit" disabled={status === 'sending'}
              style={{ width: '100%', fontFamily: "'Anton', sans-serif", fontSize: 16, padding: '13px 16px', borderRadius: 8, border: 'none', background: tokens.red, color: '#fff', cursor: 'pointer', opacity: status === 'sending' ? 0.6 : 1 }}
            >
              {status === 'sending' ? 'СОХРАНЯЕМ…' : 'СОХРАНИТЬ ПАРОЛЬ'}
            </button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0B0C0E' }} />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
