'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';

export default function DealerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data?.user) {
        // Verify if user is actually a dealer
        const { data: dealer, error: dealerError } = await supabase
          .from('dealers')
          .select('*')
          .eq('email', email)
          .single();

        // If they are not found as a dealer, check by auth_user_id linkage
        if (dealerError || !dealer) {
          const { data: dealerById } = await supabase
            .from('dealers')
            .select('*')
            .eq('auth_user_id', data.user.id)
            .single();

          if (!dealerById) {
            setError('Access Denied: This account is not registered as a dealer.');
            await supabase.auth.signOut();
            return;
          }
        }
        
        router.push('/dealer/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FAFAF8] md:shadow-2xl md:border-x md:border-[#EBEBEB] flex flex-col justify-between font-sans overflow-y-auto">
      <div className="flex flex-col">
        {/* Status Bar */}
        <StatusBar theme="dark" />

        {/* Dark Header */}
        <div style={{ background: '#16151A', padding: '16px 24px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>
              MeraWala<span style={{ color: '#E4632E' }}>Price</span>
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#9a9a9a' }}>· Dealer Portal</span>
          </div>
        </div>

        {/* Form Container */}
        <div style={{ padding: '28px 24px' }}>
          <form onSubmit={handleSignIn} style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '22px', boxShadow: '0 4px 14px rgba(0,0,0,.08)' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 800 }}>Welcome back, dealer</h2>
            
            {error && (
              <div className="text-red-500 text-xs font-semibold mb-4 bg-red-50 p-3 rounded-lg border border-red-100">
                ⚠️ {error}
              </div>
            )}

            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#6B6B6B', display: 'block' }}>Email</label>
            <input
              type="email"
              placeholder="sharma.electronics@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', background: '#FAFAF8', border: '1px solid #EBEBEB', borderRadius: '12px', padding: '13px 14px', marginTop: '6px', fontSize: '14px', fontWeight: 600, outline: 'none' }}
              className="focus:border-[#F0743E] transition-colors"
            />

            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#6B6B6B', display: 'block', marginTop: '16px' }}>Password</label>
            <div style={{ background: '#FAFAF8', border: '1px solid #EBEBEB', borderRadius: '12px', padding: '13px 14px', marginTop: '6px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontWeight: 600 }}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{ fontSize: '12px', fontWeight: 700, color: '#F0743E', cursor: 'pointer', userSelect: 'none' }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </span>
            </div>

            <div style={{ textAlign: 'right', marginTop: '10px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#F0743E', cursor: 'pointer' }}>Forgot password?</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', height: '52px', marginTop: '18px', background: '#F0743E', color: '#fff', border: 'none', borderRadius: '12px', fontFamily: 'inherit', fontSize: '15px', fontWeight: 700, boxShadow: '0 6px 16px rgba(240,116,62,.3)', cursor: 'pointer' }}
              className="active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '22px' }}>
            <Link href="/dealer/register">
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#6B6B6B', cursor: 'pointer' }}>
                New dealer? <span style={{ color: '#F0743E', fontWeight: 700 }}>Register your shop →</span>
              </span>
            </Link>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '0 24px 30px' }}>
        <Link href="/">
          <span style={{ fontSize: '12.5px', color: '#6B6B6B', fontWeight: 600, cursor: 'pointer' }}>
            For buyers: <span style={{ color: '#141414', fontWeight: 700 }}>Go to main site →</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
