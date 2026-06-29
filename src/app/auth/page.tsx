'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const returnUrl = searchParams.get('returnUrl') || localStorage.getItem('mwp_return_url') || '/';
        router.push(returnUrl);
      }
    });

    const returnUrlParam = searchParams.get('returnUrl');
    if (returnUrlParam) {
      localStorage.setItem('mwp_return_url', returnUrlParam);
    }
  }, [router, searchParams]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const redirectToUrl = `${window.location.origin}/auth/callback`;
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectToUrl,
        },
      });
      if (signInError) throw signInError;
    } catch (err: any) {
      setError(err.message || 'Google Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-white border border-[#EBEBEB] rounded-[24px] p-8 text-center shadow-sm">
      {/* Stylized M logo */}
      <div className="w-16 h-16 bg-[#F0743E] rounded-[16px] flex items-center justify-center mx-auto mb-6 text-white font-extrabold text-[32px] tracking-tight">
        M
      </div>

      <h1 className="text-[24px] font-extrabold tracking-tight text-[#141414]">
        Welcome to MereWalaPrice
      </h1>
      <p className="text-[14px] text-[#6B6B6B] mt-2 mb-8 font-medium">
        Verify your account to receive local dealer quotes and track pricing.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 text-xs font-semibold mb-6">
          {error}
        </div>
      )}

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-white border-[1.5px] border-[#EBEBEB] text-[#141414] hover:bg-[#FAFAF8] active:scale-[0.97] transition-all py-3.5 px-6 rounded-[12px] font-bold text-sm"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-[#141414] border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <>
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-1.5 mt-8 text-[11px] text-[#A0A0A0] font-semibold uppercase tracking-wider">
        <ShieldCheck className="w-4 h-4 text-[#F0743E]" />
        Secure Supabase Authentication
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-[#FAFAF8] text-[#141414] font-sans">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#F0743E] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <AuthContent />
      </Suspense>
    </div>
  );
}
