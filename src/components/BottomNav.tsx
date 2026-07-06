import Link from 'next/link';

interface BottomNavProps {
  active: 'home' | 'browse' | 'search' | 'requests' | 'profile';
}

const tabs = [
  { 
    key: 'home', 
    href: '/', 
    label: 'Home',
    icon: (color: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>
    )
  },
  { 
    key: 'browse', 
    href: '/browse', 
    label: 'Browse',
    icon: (color: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
    )
  },
  { 
    key: 'search', 
    href: '/search', 
    label: 'Search',
    icon: (color: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    )
  },
  { 
    key: 'requests', 
    href: '/dashboard', 
    label: 'Requests',
    icon: (color: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v12H8l-4 4V4z"/></svg>
    )
  },
  { 
    key: 'profile', 
    href: '/dashboard', 
    label: 'Profile',
    icon: (color: string) => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>
    )
  },
];

export default function BottomNav({ active }: BottomNavProps) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '12px 8px 26px', background: '#fff',
      borderTop: '1px solid #EAE6DD', flexShrink: 0,
      position: 'sticky', bottom: 0, zIndex: 50,
    }}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const color = isActive ? '#E4632E' : '#9A978E';
        return (
          <Link key={tab.key} href={tab.href} style={{ textDecoration: 'none' }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '5px', 
              padding: '5px 14px', 
              borderRadius: '12px',
              background: isActive ? '#FBEEE7' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}>
              {tab.icon(color)}
              <span style={{ 
                fontSize: '9.5px', 
                fontWeight: isActive ? 800 : 600, 
                color: color 
              }}>
                {tab.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
