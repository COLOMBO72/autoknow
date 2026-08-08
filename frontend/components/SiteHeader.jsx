'use client';

import React, { useEffect, useState } from 'react';
import { tokens } from '../lib/tokens';
import { isLoggedIn, getUserEmail } from '../lib/session';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

export default function SiteHeader({ maxWidth = 1080 }) {
  // Состояние логина читаем только на клиенте после монтирования — до этого
  // просто не показываем блок авторизации, чтобы не мигало гостем на долю
  // секунды у залогиненных (cookie ещё не прочитан на сервере/при гидрации).
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState(null);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setEmail(getUserEmail());
    setReady(true);
  }, []);

  const isAdmin = email && ADMIN_EMAIL && email === ADMIN_EMAIL;

  return (
    <header style={{ maxWidth, margin: '0 auto', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <a href="/" style={{ fontFamily: "'Anton', sans-serif", fontSize: 22, letterSpacing: '0.03em', textDecoration: 'none', color: tokens.ink }}>
        AUTO<span style={{ color: tokens.red }}>KNOW</span>
      </a>

      {ready && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isAdmin && (
            <a
              href="/admin"
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: tokens.amber, border: `1px solid ${tokens.amber}`, borderRadius: 20, padding: '9px 14px', textDecoration: 'none' }}
            >
              АДМИНКА
            </a>
          )}

          {loggedIn ? (
            <a
              href="/account"
              style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: tokens.ink, border: `1px solid ${tokens.line}`, borderRadius: 20, padding: '9px 16px', textDecoration: 'none', maxWidth: '45vw', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {email}
            </a>
          ) : (
            <a
              href="/login"
              style={{ fontFamily: "'Anton', sans-serif", fontSize: 14, letterSpacing: '0.02em', color: '#fff', background: tokens.red, borderRadius: 20, padding: '10px 18px', textDecoration: 'none' }}
            >
              ВОЙТИ
            </a>
          )}
        </div>
      )}
    </header>
  );
}
