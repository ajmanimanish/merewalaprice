'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';

interface PopularProduct {
  id: string;
  brand: string;
  model: string;
  name: string;
  category: string;
  price: number;
  diffText: string;
  image_url: string | null;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [totalProductsCount, setTotalProductsCount] = useState(312);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({
    AC: 43,
    TV: 61,
    WM: 38,
    FRIDGE: 52,
    LAPTOP: 44,
  });
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([
    {
      id: 'voltas-123inv',
      brand: 'Voltas',
      model: '123INV',
      name: '1T 3★ Inverter Vectra',
      category: 'AC',
      price: 28499,
      diffText: '₹3,491 less than Amazon',
    },
    {
      id: 'samsung-55-crystal',
      brand: 'Samsung',
      model: 'UA55CU7700KLXL',
      name: '55" Crystal 4K UHD',
      category: 'TV',
      price: 42990,
      diffText: '₹5,000 less than Amazon',
    },
    {
      id: 'lg-260l-fridge',
      brand: 'LG',
      model: 'GL-S292RDSY',
      name: '260L Frost-Free Fridge',
      category: 'FRIDGE',
      price: 24700,
      diffText: '₹2,300 less than Amazon',
    },
  ]);

  // Auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch Supabase data
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch category counts
        const { data: productsData } = await supabase
          .from('products')
          .select('id, category')
          .eq('is_active', true);
        
        if (productsData) {
          setTotalProductsCount(productsData.length);
          const counts: Record<string, number> = { AC: 0, TV: 0, WM: 0, FRIDGE: 0, LAPTOP: 0 };
          productsData.forEach((p) => {
            if (p.category in counts) {
              counts[p.category]++;
            }
          });
          setCategoryCounts(counts);
        }

        // Fetch popular products (with online prices)
        const { data: popData } = await supabase
          .from('products')
          .select(`
            id,
            brand,
            model_number,
            name,
            category,
            image_url,
            online_prices (
              platform,
              price
            )
          `)
          .eq('is_active', true)
          .limit(8);

        if (popData) {
          const formatted: PopularProduct[] = popData
            .map((p: any) => {
              const onlinePrices = p.online_prices || [];
              const dealerPrices = p.dealer_prices || [];
              const minPrice = dealerPrices.length > 0 
                ? Math.min(...dealerPrices.map((x: any) => x.price))
                : (onlinePrices.length > 0 ? Math.min(...onlinePrices.map((x: any) => x.price)) : 30000);

              const amz = onlinePrices.find((x: any) => x.platform.toLowerCase() === 'amazon')?.price;
              const fk = onlinePrices.find((x: any) => x.platform.toLowerCase() === 'flipkart')?.price;
              const cr = onlinePrices.find((x: any) => x.platform.toLowerCase() === 'croma')?.price;
              
              let diffText = '';
              if (amz && minPrice < amz) {
                diffText = `₹${(amz - minPrice).toLocaleString('en-IN')} less than Amazon`;
              } else if (fk && minPrice < fk) {
                diffText = `₹${(fk - minPrice).toLocaleString('en-IN')} less than Flipkart`;
              } else if (cr && minPrice < cr) {
                diffText = `₹${(cr - minPrice).toLocaleString('en-IN')} less than Croma`;
              } else if (amz) {
                diffText = 'Check local vs online';
              } else {
                diffText = 'Local dealer price';
              }

              return {
                id: p.id,
                brand: p.brand,
                model: p.model_number,
                name: p.name || p.model_number,
                category: p.category,
                price: minPrice,
                diffText,
                image_url: p.image_url || null,
              };
            })
            .filter(Boolean) as PopularProduct[];
          
          if (formatted.length > 0) {
            setPopularProducts(formatted);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard counts/popular:', err);
      }
    }
    fetchData();
  }, []);

  const getCatEmoji = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'AC': return '❄️';
      case 'TV': return '📺';
      case 'WM': return '🌀';
      case 'FRIDGE': return '🧊';
      case 'LAPTOP': return '💻';
      default: return '🔌';
    }
  };

  return (
    <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FDFCFA] md:shadow-2xl md:border-x md:border-[#EAE6DD] flex flex-col justify-between font-sans overflow-y-auto">
      <div className="flex flex-col">
        {/* Status Bar */}
        <StatusBar />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 10px' }}>
          <span style={{ fontSize: '21px', fontWeight: 800, letterSpacing: '-.02em', color: '#16151A' }}>
            MereWala<span style={{ color: '#E4632E' }}>Price</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link href="/search">
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#fff', border: '1px solid #EAE6DD', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16151A" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
            </Link>
            {user ? (
              <Link href="/dashboard">
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', 
                  background: '#E4632E', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', fontSize: '15px', fontWeight: 800, color: '#fff', cursor: 'pointer' }}>
                  {user.user_metadata?.full_name?.[0]?.toUpperCase() || 
                   user.email?.[0]?.toUpperCase() || 'U'}
                </div>
              </Link>
            ) : (
              <Link href="/auth">
                <div style={{ height: '38px', padding: '0 16px', borderRadius: '999px', 
                  background: '#E4632E', display: 'flex', alignItems: 'center', 
                  fontSize: '13px', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                  Sign in
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Location Pill */}
        <div style={{ padding: '0 20px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#fff', border: '1px solid #EAE6DD', padding: '8px 14px', borderRadius: '999px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E4632E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.1 7-11.5A7 7 0 105 9.5C5 14.9 12 21 12 21z"/><circle cx="12" cy="9.3" r="2.4"/></svg>
            <span style={{ fontSize: '13px', fontWeight: 700 }}>Bhopal</span>
            <span style={{ fontSize: '13px', color: '#B9B6AC' }}>·</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#E4632E', cursor: 'pointer' }}>Change</span>
          </div>
        </div>

        {/* Hero */}
        <div style={{ padding: '18px 20px 4px' }}>
          <h2 style={{ margin: 0, fontSize: '25px', fontWeight: 800, letterSpacing: '-.02em', lineHeight: '1.22' }}>
            Best price. Local dealer.<br />Verified <span style={{ color: '#E4632E' }}>today.</span>
          </h2>
        </div>

        {/* Trust Stats Strip */}
        <div style={{ display: 'flex', gap: '8px', padding: '14px 20px 4px' }}>
          <div style={{ flex: 1, background: '#fff', border: '1px solid #EAE6DD', borderRadius: '14px', padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 800 }}>47</div>
            <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#6B6963', marginTop: '1px' }}>verified dealers</div>
          </div>
          <div style={{ flex: 1, background: '#fff', border: '1px solid #EAE6DD', borderRadius: '14px', padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1F8A5C' }}>Today</div>
            <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#6B6963', marginTop: '1px' }}>prices refreshed</div>
          </div>
          <div style={{ flex: 1, background: '#fff', border: '1px solid #EAE6DD', borderRadius: '14px', padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 800 }}>{totalProductsCount}</div>
            <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#6B6963', marginTop: '1px' }}>products listed</div>
          </div>
        </div>

        {/* Category Grid */}
        <div style={{ padding: '18px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Link href="/category/ac">
            <div style={{ background: '#E4632E', borderRadius: '18px', padding: '16px', boxShadow: '0 10px 24px -8px rgba(228,99,46,.55)', cursor: 'pointer' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="10" rx="2"/><path d="M6 15v3M18 15v3M2 10h20"/></svg>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '12px' }}>Air Conditioners</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,.85)', marginTop: '2px' }}>{categoryCounts.AC} products</div>
            </div>
          </Link>
          <Link href="/category/tv">
            <div style={{ background: '#fff', border: '1px solid #EAE6DD', borderRadius: '18px', padding: '16px', cursor: 'pointer' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16151A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#16151A', marginTop: '12px' }}>Televisions</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B6963', marginTop: '2px' }}>{categoryCounts.TV} products</div>
            </div>
          </Link>
          <Link href="/category/wm">
            <div style={{ background: '#fff', border: '1px solid #EAE6DD', borderRadius: '18px', padding: '16px', cursor: 'pointer' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16151A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#16151A', marginTop: '12px' }}>Washing Machine</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B6963', marginTop: '2px' }}>{categoryCounts.WM} products</div>
            </div>
          </Link>
          <Link href="/category/fridge">
            <div style={{ background: '#fff', border: '1px solid #EAE6DD', borderRadius: '18px', padding: '16px', cursor: 'pointer' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16151A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M5 9h14"/></svg>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#16151A', marginTop: '12px' }}>Refrigerators</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B6963', marginTop: '2px' }}>{categoryCounts.FRIDGE} products</div>
            </div>
          </Link>
          <Link href="/category/laptop">
            <div style={{ background: '#fff', border: '1px solid #EAE6DD', borderRadius: '18px', padding: '16px', cursor: 'pointer' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16151A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M1 19h22"/></svg>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#16151A', marginTop: '12px' }}>Laptops</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B6963', marginTop: '2px' }}>{categoryCounts.LAPTOP} products</div>
            </div>
          </Link>
          <Link href="/browse">
            <div style={{ background: '#fff', border: '1px dashed #D8D2C4', borderRadius: '18px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E4632E" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#16151A', marginTop: '10px' }}>View All</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B6963', marginTop: '2px' }}>{totalProductsCount} total</div>
            </div>
          </Link>
        </div>

        {/* Popular Right Now */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 20px 12px' }}>
          <span style={{ fontSize: '16px', fontWeight: 800, color: '#16151A' }}>Popular right now</span>
          <Link href="/browse">
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#E4632E', cursor: 'pointer' }}>See all</span>
          </Link>
        </div>

        {/* Horizontal Card Scroll */}
        <div className="scrollx" style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '0 20px 4px' }}>
          {popularProducts.map((p) => (
            <div
              key={p.id}
              onClick={() => router.push(`/product/${p.id}`)}
              style={{ flex: '0 0 160px', background: '#fff', border: '1px solid #EAE6DD', borderRadius: '18px', padding: '12px', position: 'relative', cursor: 'pointer' }}
            >
              <div style={{ position: 'absolute', top: '16px', right: '16px', width: '26px', height: '26px', borderRadius: '50%', background: '#F6F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B6963" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.35-9.5-8.5C1 9.5 2.5 6 6 6c2 0 3.5 1.2 4 2.3C10.5 7.2 12 6 14 6c3.5 0 5 3.5 3.5 6.5C19 16.65 12 21 12 21z"/></svg>
              </div>
              <div style={{
                height: '88px', borderRadius: '12px', background: '#F6F4EF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={`${p.brand} ${p.model}`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = 
                        `<span style="font-size:40px">${getCatEmoji(p.category)}</span>`;
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '40px' }}>{getCatEmoji(p.category)}</span>
                )}
              </div>
              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#E4632E', textTransform: 'uppercase', marginTop: '10px' }}>{p.brand}</div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#16151A', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#16151A', marginTop: '8px' }}>From ₹ {p.price.toLocaleString()}</div>
              {p.diffText && p.diffText.includes('less') && (
                <div style={{
                  marginTop: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#E7F5EE',
                  color: '#1F8A5C',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '4px 8px',
                  borderRadius: '999px',
                }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#1F8A5C" strokeWidth="3" strokeLinecap="round">
                    <line x1="17" y1="7" x2="7" y2="17" />
                    <polyline points="17 17 17 7 7 7" />
                  </svg>
                  {p.diffText.split('than')[0].trim()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <BottomNav active="home" />
    </div>
  );
}
