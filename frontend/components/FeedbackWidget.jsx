'use client';

import React, { useState } from 'react';
import { tokens } from '../lib/tokens';
import { api } from '../lib/api';

const TYPES = [
  { value: 'INCORRECT_DATA', label: 'В отчёте ошибка' },
  { value: 'SUGGESTION', label: 'Предложение' },
  { value: 'SUPPORT', label: 'Техподдержка' },
  { value: 'OTHER', label: 'Другое' },
];

export default function FeedbackWidget({ userId, carVariantId }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('INCORRECT_DATA');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  async function handleSubmit() {
    if (!message.trim()) return;
    setStatus('sending');
    try {
      await api.sendFeedback({ userId, carVariantId, type, message: message.trim(), contactInfo: contact.trim() || undefined });
      setStatus('sent');
      setMessage('');
      setContact('');
    } catch {
      setStatus('error');
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ak-focus"
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 12.5,
          color: tokens.inkSoft,
          background: 'none',
          border: `1px solid ${tokens.line}`,
          borderRadius: 20,
          padding: '7px 14px',
          cursor: 'pointer',
        }}
      >
        Нашли ошибку в отчёте? Напишите нам
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: tokens.surface, border: `1px solid ${tokens.line}`, borderRadius: 10, padding: 24, maxWidth: 420, width: '100%' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: "'Anton', sans-serif", fontSize: 18, margin: 0, color: tokens.ink }}>НАПИСАТЬ НАМ</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть" style={{ background: 'none', border: 'none', color: tokens.inkSoft, fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>

            {status === 'sent' ? (
              <p style={{ color: tokens.ink, fontSize: 14 }}>Спасибо, получили! Если оставили контакт — ответим туда.</p>
            ) : (
              <>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  style={{ width: '100%', marginBottom: 10, padding: '9px 10px', borderRadius: 6, border: `1px solid ${tokens.line}`, background: '#1C1F24', color: tokens.ink, fontFamily: "'Inter', sans-serif", fontSize: 14 }}
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Что не так или что предлагаете?"
                  rows={4}
                  style={{ width: '100%', marginBottom: 10, padding: '9px 10px', borderRadius: 6, border: `1px solid ${tokens.line}`, background: '#1C1F24', color: tokens.ink, fontFamily: "'Inter', sans-serif", fontSize: 14, resize: 'vertical' }}
                />
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Email или телеграм, если нужен ответ (необязательно)"
                  style={{ width: '100%', marginBottom: 14, padding: '9px 10px', borderRadius: 6, border: `1px solid ${tokens.line}`, background: '#1C1F24', color: tokens.ink, fontFamily: "'Inter', sans-serif", fontSize: 14 }}
                />
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!message.trim() || status === 'sending'}
                  style={{ width: '100%', fontFamily: "'Anton', sans-serif", fontSize: 14, padding: '11px 16px', borderRadius: 8, border: 'none', background: tokens.red, color: '#fff', cursor: 'pointer', opacity: !message.trim() || status === 'sending' ? 0.5 : 1 }}
                >
                  {status === 'sending' ? 'ОТПРАВЛЯЕМ…' : 'ОТПРАВИТЬ'}
                </button>
                {status === 'error' && <p style={{ color: tokens.red, fontSize: 12, marginTop: 8 }}>Не отправилось — попробуй ещё раз или напиши в ВК ниже.</p>}
                <p style={{ fontSize: 11.5, color: tokens.inkSoft, marginTop: 14, textAlign: 'center' }}>
                  Быстрее — в{' '}
                  <a href="https://vk.ru/veliumdev" target="_blank" rel="noopener noreferrer" style={{ color: tokens.inkSoft }}>ВК-группе</a>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
