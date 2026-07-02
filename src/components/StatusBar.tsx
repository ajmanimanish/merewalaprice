'use client';
import { useState, useEffect } from 'react';

interface StatusBarProps {
  theme?: 'light' | 'dark';
}

export default function StatusBar({ theme = 'light' }: StatusBarProps) {
  const [time, setTime] = useState('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', { 
        hour: '2-digit', minute: '2-digit', hour12: false 
      }));
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const isDark = theme === 'dark';
  const color = isDark ? '#fff' : '#141414';
  
  return (
    <div style={{ height: '44px', display: 'flex', alignItems: 'center', 
      justifyContent: 'space-between', padding: '0 24px', flexShrink: 0,
      color: color, background: isDark ? '#141414' : 'transparent' }}>
      <span style={{ fontSize: '14px', fontWeight: 800 }}>{time}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ fontSize: '11px' }}>📶</span>
        <span style={{ fontSize: '11px' }}>🛜</span>
        <div style={{ width: '22px', height: '11px', border: `1.5px solid ${color}`, 
          borderRadius: '3px', padding: '1.5px', display: 'flex' }}>
          <div style={{ flex: 1, background: color, borderRadius: '1px' }}></div>
        </div>
      </div>
    </div>
  );
}
