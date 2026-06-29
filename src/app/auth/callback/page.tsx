'use client';

import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleAuthCallback() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }

      // Check if session exists
      const { data: { session } } = await supabase.auth.getSession();
      
      // Auto-create or fetch user profile
      if (session?.user) {
        const user = session.user;
        
        // Let's check if the profile exists
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (!existingProfile) {
          // Create user profile
          const fullName = user.user_metadata?.full_name || user.user_metadata?.name || '';
          await supabase.from('user_profiles').insert({
            id: user.id,
            full_name: fullName,
            city: 'Bhopal'
          });
        }
      }

      const returnUrl = localStorage.getItem('mwp_return_url') || '/';
      localStorage.removeItem('mwp_return_url');
      router.push(returnUrl);
    }

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAFAF8] text-[#141414] font-sans">
      <div className="w-10 h-10 border-4 border-[#F0743E] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[13px] font-bold text-[#6B6B6B] mt-4 uppercase tracking-wider animate-pulse">
        Completing login...
      </p>
    </div>
  );
}
