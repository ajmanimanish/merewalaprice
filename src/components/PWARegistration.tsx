'use client';

import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function PWARegistration() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // 1. Register the PWA service worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('PWA service worker registered successfully:', registration.scope);
          })
          .catch((error) => {
            console.error('Service worker registration failed:', error);
          });
      });
    }

    // 2. Track visit count via LocalStorage
    if (typeof window !== 'undefined') {
      const visitKey = 'mwp_visit_count';
      const visits = parseInt(localStorage.getItem(visitKey) || '0', 10) + 1;
      localStorage.setItem(visitKey, visits.toString());

      // 3. Handle PWA installer intercept
      const captureInstallPrompt = (event: Event) => {
        // Prevent default browser install banners
        event.preventDefault();
        setDeferredPrompt(event);

        // Render installer prompt strictly on 2nd visit onwards
        if (visits >= 2) {
          setShowBanner(true);
        }
      };

      window.addEventListener('beforeinstallprompt', captureInstallPrompt);

      return () => {
        window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
      };
    }
  }, []);

  const triggerPWAInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA Installation outcome selected: ${outcome}`);

    setDeferredPrompt(null);
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-[388px] mx-auto bg-slate-950 text-white rounded-card p-4 border border-slate-800/80 shadow-2xl flex items-center justify-between z-50 animate-in slide-in-from-bottom-5 duration-350">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary text-white rounded-full shadow-md shadow-orange-500/20">
          <Download className="w-4.5 h-4.5" />
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider">MereWalaPrice App</h4>
          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
            Add to your home screen for quick access!
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-1.5">
        <button
          onClick={triggerPWAInstall}
          className="bg-primary hover:bg-primary-hover active:scale-95 text-white text-xs font-black px-3.5 py-2 rounded-input transition-all shadow shadow-orange-500/10 whitespace-nowrap"
        >
          Add to Screen
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="text-slate-400 hover:text-slate-200 p-1.5"
          aria-label="Close install prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
