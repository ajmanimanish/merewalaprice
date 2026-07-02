import Link from 'next/link';

interface BottomNavProps {
  active: 'home' | 'browse' | 'search' | 'requests' | 'profile';
}

const tabs = [
  { key: 'home',     href: '/',         emoji: '🏠', label: 'Home' },
  { key: 'browse',   href: '/browse',   emoji: '🗂️', label: 'Browse' },
  { key: 'search',   href: '/search',   emoji: '🔍', label: 'Search' },
  { key: 'requests', href: '/dashboard', emoji: '📩', label: 'Requests' },
  { key: 'profile',  href: '/dashboard', emoji: '👤', label: 'Profile' },
];

export default function BottomNav({ active }: BottomNavProps) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '10px 8px 24px', background: '#fff',
      borderTop: '1px solid #EBEBEB', flexShrink: 0,
      position: 'sticky', bottom: 0,
    }}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link key={tab.key} href={tab.href} style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <span style={{ fontSize: '18px', filter: isActive ? 'none' : 'grayscale(1)', opacity: isActive ? 1 : 0.55 }}>
                {tab.emoji}
              </span>
              <span style={{ fontSize: '10px', fontWeight: isActive ? 800 : 600, color: isActive ? '#F0743E' : '#6B6B6B' }}>
                {tab.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
