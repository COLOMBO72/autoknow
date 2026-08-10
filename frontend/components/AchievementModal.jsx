'use client';

import React from 'react';
import { tokens } from '../lib/tokens';

export default function AchievementModal({ onClose }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 60 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: tokens.surface, border: `1px solid ${tokens.amber}`, borderRadius: 12, padding: 28, maxWidth: 380, width: '100%', textAlign: 'center' }}
      >
        <div style={{ fontSize: 40, marginBottom: 10 }}>🏆</div>
        <h3 style={{ fontFamily: "'Anton', sans-serif", fontSize: 19, margin: '0 0 10px', color: tokens.amber }}>
          ПЕРВЫЙ ОТЧЁТ ПОЛУЧЕН
        </h3>
        <p style={{ fontSize: 13.5, color: tokens.inkSoft, lineHeight: 1.6, marginBottom: 20 }}>
          В личном кабинете появилась памятка «Как купить и продать автомобиль самому» —
          пригодится, если покупаешь машину впервые.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <a
            href="/account"
            style={{ fontFamily: "'Anton', sans-serif", fontSize: 13, padding: '10px 18px', borderRadius: 8, background: tokens.red, color: '#fff', textDecoration: 'none' }}
          >
            ОТКРЫТЬ ПАМЯТКУ
          </a>
          <button
            type="button"
            onClick={onClose}
            style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, padding: '10px 18px', borderRadius: 8, border: `1px solid ${tokens.line}`, background: 'none', color: tokens.inkSoft, cursor: 'pointer' }}
          >
            Позже
          </button>
        </div>
      </div>
    </div>
  );
}
