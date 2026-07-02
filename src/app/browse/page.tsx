'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';

const categories = [
  { code: 'AC', label: 'Air Conditioners', emoji: '❄️' },
  { code: 'TV', label: 'Smart TVs', emoji: '📺' },
  { code: 'WM', label: 'Washing Machines', emoji: '🌀' },
  { code: 'FRIDGE', label: 'Refrigerators', emoji: '🧊' },
  { code: 'LAPTOP', label: 'Laptops', emoji: '💻' },
];

export default function BrowsePage() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    supabase
      .from('products')
      .select('category')
      .eq('is_active', true)
      .then(({ data }) => {
        if (!data) return;
        const c: Record<string, number> = {};
        data.forEach((p) => { c[p.category] = (c[p.category] || 0) + 1; });
        setCounts(c);
      });
  }, []);

  return (
    <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FAFAF8] md:shadow-2xl md:border-x md:border-[#EBEBEB] flex flex-col font-sans justify-between">
      <div className="flex flex-col flex-1">
        <StatusBar />

        {/* Header */}
        <div style={{ padding: '8px 20px 16px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '-.02em' }}>
            Browse <span style={{ color: '#F0743E' }}>Categories</span>
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 600, color: '#6B6B6B' }}>
            {Object.values(counts).reduce((a, b) => a + b, 0) || '—'} products from Bhopal dealers
          </p>
        </div>

        {/* Category Grid */}
        <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
          {categories.map((cat, i) => (
            <Link key={cat.code} href={`/category/${cat.code}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: i === 0 ? '#F0743E' : '#fff',
                border: i === 0 ? 'none' : '1px solid #EBEBEB',
                borderRadius: '16px',
                padding: '18px 16px',
                boxShadow: i === 0 ? '0 4px 12px rgba(240,116,62,.28)' : '0 1px 3px rgba(0,0,0,.06)',
                cursor: 'pointer',
                minHeight: '110px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '28px' }}>{cat.emoji}</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: i === 0 ? '#fff' : '#141414', marginTop: '10px' }}>
                    {cat.label}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: i === 0 ? 'rgba(255,255,255,.8)' : '#6B6B6B', marginTop: '2px' }}>
                    {counts[cat.code] || 0} products
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {/* Search tile */}
          <Link href="/search" style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#fff', border: '1px dashed #CDBCDB', borderRadius: '16px',
              padding: '18px 16px', cursor: 'pointer', minHeight: '110px',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '28px' }}>🔍</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '10px' }}>Search</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B6B6B', marginTop: '2px' }}>Find by model</div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <BottomNav active="browse" />
    </div>
  );
}
