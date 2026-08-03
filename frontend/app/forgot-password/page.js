'use client';

import React, { useState } from 'react';
import { tokens } from '../../lib/tokens';
import { api } from '../../lib/api';
import SiteFooter from '../../components/SiteFooter';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    try {
      await api.forgotPassword(email);
      setStatus('sent');
    } catch {
      setStatus('sent'); // намеренно не раскрываем, существует ли email
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
        <h1 style={{ fontFamily: "'Anton', sans-serif", fontSize: 26, margin: '0 0 16px' }}>ЗАБЫЛИ ПАРОЛЬ?</h1>

        {status === 'sent' ? (
          <p style={{ color: tokens.inkSoft, fontSize: 14 }}>
            Если такой email зарегистрирован — на него отправлена ссылка для сброса пароля.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ color: tokens.inkSoft, fontSize: 14, marginBottom: 16 }}>Укажи email — пришлём ссылку для сброса пароля.</p>
            <input
              type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '11px 12px', borderRadius: 6, border: `1px solid ${tokens.line}`, background: '#1C1F24', color: tokens.ink, fontFamily: "'Inter', sans-serif", fontSize: 15, marginBottom: 14 }}
            />
            <button
              type="submit" disabled={status === 'sending'}
              style={{ width: '100%', fontFamily: "'Anton', sans-serif", fontSize: 16, padding: '13px 16px', borderRadius: 8, border: 'none', background: tokens.red, color: '#fff', cursor: 'pointer', opacity: status === 'sending' ? 0.6 : 1 }}
            >
              {status === 'sending' ? 'ОТПРАВЛЯЕМ…' : 'ПРИСЛАТЬ ССЫЛКУ'}
            </button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
