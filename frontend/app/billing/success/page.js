'use client';

import React from 'react';
import { tokens } from '../../../lib/tokens';
import SiteFooter from '../../../components/SiteFooter';
import SiteHeader from '../../../components/SiteHeader';

export default function BillingSuccessPage() {
  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${tokens.bgGradientTop} 0%, ${tokens.bg} 380px)`, color: tokens.ink, fontFamily: "'Inter', sans-serif" }}>
      <SiteHeader maxWidth={600} />
      <main style={{ maxWidth: 600, margin: '60px auto 0', padding: '0 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Anton', sans-serif", fontSize: 28, margin: '0 0 12px' }}>ОПЛАТА ПРИНЯТА</h1>
        <p style={{ color: tokens.inkSoft, marginBottom: 24 }}>
          Баланс обновится в течение нескольких секунд после подтверждения от ЮKassa.
        </p>
        <a
          href="/account"
          style={{ display: 'inline-block', fontFamily: "'Anton', sans-serif", fontSize: 14, padding: '12px 22px', borderRadius: 8, background: tokens.red, color: '#fff', textDecoration: 'none' }}
        >
          В ЛИЧНЫЙ КАБИНЕТ
        </a>
      </main>
      <SiteFooter />
    </div>
  );
}
