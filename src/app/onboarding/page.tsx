'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatusBar from '@/components/StatusBar';

export default function OnboardingPage() {
  const router = useRouter();

  const handleBrowse = () => {
    localStorage.setItem('has_onboarded', 'true');
    router.push('/');
  };

  return (
    <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FAFAF8] md:shadow-2xl md:border-x md:border-[#EBEBEB] flex flex-col justify-between font-sans overflow-y-auto">
      <div style={{ minHeight: '844px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {/* Status Bar */}
        <StatusBar />

        {/* Skip Link */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 22px 0' }}>
          <span onClick={handleBrowse} style={{ fontSize: '14px', fontWeight: 600, color: '#6B6B6B', cursor: 'pointer' }}>
            Skip
          </span>
        </div>

        {/* Floating Banner */}
        <div style={{ padding: '8px 24px 0' }}>
          <div style={{ position: 'relative', height: '268px', borderRadius: '24px', background: 'linear-gradient(160deg,#F3ECF7 0%,#FBF3EF 100%)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: '150px', height: '150px', borderRadius: '50%', background: '#CDBCDB', opacity: .35, top: '-40px', left: '-30px' }}></div>
            <div style={{ position: 'absolute', width: '120px', height: '120px', borderRadius: '50%', background: '#FDDB48', opacity: .30, bottom: '-30px', right: '-20px' }}></div>
            
            {/* Float Card */}
            <div style={{ position: 'relative', zIndex: 2, width: '172px', background: '#fff', borderRadius: '20px', boxShadow: '0 12px 30px rgba(20,20,20,.12)', padding: '14px' }}>
              <div style={{ height: '78px', borderRadius: '12px', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', fontSize: '34px' }}>
                ❄️
              </div>
              <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.06em', color: '#F0743E', textTransform: 'uppercase' }}>Blue Star</div>
              <div style={{ fontSize: '11px', fontWeight: 700, marginTop: '3px', lineHeight: 1.3 }}>1.5T 5★ Inverter AC</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '8px' }}>
                <span style={{ fontSize: '17px', fontWeight: 800 }}>₹35,800</span>
                <span style={{ fontSize: '10px', color: '#6B6B6B', textDecoration: 'line-through' }}>₹38,990</span>
              </div>
              <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#E7F6ED', color: '#16A34A', fontSize: '9px', fontWeight: 700, padding: '4px 8px', borderRadius: '999px' }}>
                💰 Save ₹3,190
              </div>
            </div>

            {/* Icon elements */}
            <div style={{ position: 'absolute', zIndex: 3, top: '34px', right: '30px', width: '60px', height: '60px', borderRadius: '18px', background: '#F0743E', boxShadow: '0 8px 18px rgba(240,116,62,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
              🏪
            </div>
            <div style={{ position: 'absolute', zIndex: 3, bottom: '28px', left: '26px', display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fff', boxShadow: '0 6px 14px rgba(20,20,20,.10)', padding: '7px 11px', borderRadius: '999px' }}>
              <span style={{ fontSize: '12px' }}>📍</span>
              <span style={{ fontSize: '11px', fontWeight: 700 }}>Bhopal</span>
            </div>
          </div>
        </div>

        {/* Text Details */}
        <div style={{ padding: '26px 24px 0', flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: '27px', lineHeight: 1.18, fontWeight: 800, letterSpacing: '-.02em' }}>
            Better price than online.<br />From <span style={{ color: '#F0743E' }}>Bhopal dealers.</span>
          </h1>
          <p style={{ margin: '12px 0 0', fontSize: '14px', lineHeight: 1.5, color: '#6B6B6B', fontWeight: 500 }}>
            Compare local dealer prices with Amazon, Flipkart &amp; Croma — instantly.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: '#fff', border: '1px solid #EBEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>🏪</div>
              <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Local dealer prices updated daily</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: '#fff', border: '1px solid #EBEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>💰</div>
              <span style={{ fontSize: '13.5px', fontWeight: 600 }}>See true price after card discounts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: '#fff', border: '1px solid #EBEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>📍</div>
              <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Bhopal-specific — not generic India prices</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ padding: '18px 24px 30px', flexShrink: 0 }}>
          <button
            onClick={handleBrowse}
            style={{ width: '100%', height: '54px', background: '#F0743E', color: '#fff', border: 'none', borderRadius: '12px', fontFamily: 'inherit', fontSize: '16px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 16px rgba(240,116,62,.32)' }}
          >
            Browse Products
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ width: '100%', height: '50px', marginTop: '12px', background: '#fff', color: '#141414', border: '1px solid #EBEBEB', borderRadius: '12px', fontFamily: 'inherit', fontSize: '14.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px' }}
          >
            <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'conic-gradient(#EA4335 0deg 90deg,#FBBC05 90deg 180deg,#34A853 180deg 270deg,#4285F4 270deg 360deg)', display: 'inline-block' }}></span>
            Sign in with Google
          </button>
        </div>
      </div>
    </div>
  );
}
