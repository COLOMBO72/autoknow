'use client';

import React from 'react';
import { tokens } from '../lib/tokens';

export default function SiteFooter() {
  return (
    <footer style={{ maxWidth: 1080, margin: '40px auto 0', padding: '20px 24px 40px', borderTop: `1px solid ${tokens.line}` }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: tokens.inkSoft }}>
        <span>
          Проект{' '}
          <a href="https://velium.ru" target="_blank" rel="noopener noreferrer" style={{ color: tokens.inkSoft }}>
            Velium IT Service
          </a>
        </span>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="https://vk.ru/veliumdev" target="_blank" rel="noopener noreferrer" style={{ color: tokens.inkSoft }}>
            VK
          </a>
          <a href="https://velium.ru" target="_blank" rel="noopener noreferrer" style={{ color: tokens.inkSoft }}>
            velium.ru
          </a>
        </div>
      </div>
    </footer>
  );
}
