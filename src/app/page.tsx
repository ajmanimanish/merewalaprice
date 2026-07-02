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
    <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FAFAF8] md:shadow-2xl md:border-x md:border-[#EBEBEB] flex flex-col justify-between font-sans overflow-y-auto">
      <div className="flex flex-col">
        {/* Status Bar */}
        <StatusBar />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 10px' }}>
          <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-.02em' }}>
            MereWala<span style={{ color: '#F0743E' }}>Price</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link href="/search">
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#fff', border: '1px solid #EBEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', cursor: 'pointer' }}>🔍</div>
            </Link>
            {user ? (
              <Link href="/dashboard">
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', 
                  background: '#F0743E', display: 'flex', alignItems: 'center', 
                  justifyContent: 'center', fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                  {user.user_metadata?.full_name?.[0]?.toUpperCase() || 
                   user.email?.[0]?.toUpperCase() || 'U'}
                </div>
              </Link>
            ) : (
              <Link href="/auth">
                <div style={{ height: '34px', padding: '0 14px', borderRadius: '999px', 
                  background: '#F0743E', display: 'flex', alignItems: 'center', 
                  fontSize: '13px', fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                  Sign in
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Location Pill */}
        <div style={{ padding: '0 20px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#fff', border: '1px solid #EBEBEB', padding: '8px 14px', borderRadius: '999px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <span style={{ fontSize: '12px' }}>📍</span>
            <span style={{ fontSize: '13px', fontWeight: 700 }}>Bhopal</span>
            <span style={{ fontSize: '13px', color: '#6B6B6B' }}>·</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#F0743E', cursor: 'pointer' }}>Change</span>
          </div>
        </div>

        {/* Hero */}
        <div style={{ padding: '18px 20px 6px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, letterSpacing: '-.02em', lineHeight: '1.2' }}>
            Best price. Local dealer. <span style={{ color: '#F0743E' }}>Today.</span>
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: '13px', fontWeight: 600, color: '#6B6B6B' }}>
            47 dealers · {totalProductsCount} products listed today
          </p>
        </div>

        {/* Category Grid */}
        <div style={{ padding: '14px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Link href="/category/AC">
            <div style={{ background: '#F0743E', borderRadius: '16px', padding: '14px', boxShadow: '0 4px 12px rgba(240,116,62,.28)', cursor: 'pointer' }}>
              <div style={{ fontSize: '24px' }}>❄️</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '8px' }}>AC</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,.85)', marginTop: '2px' }}>{categoryCounts.AC} products</div>
            </div>
          </Link>
          <Link href="/category/TV">
            <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', cursor: 'pointer' }}>
              <div style={{ fontSize: '24px' }}>📺</div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '8px' }}>TV</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B6B6B', marginTop: '2px' }}>{categoryCounts.TV} products</div>
            </div>
          </Link>
          <Link href="/category/WM">
            <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', cursor: 'pointer' }}>
              <div style={{ fontSize: '24px' }}>🌀</div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '8px' }}>Washing Machine</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B6B6B', marginTop: '2px' }}>{categoryCounts.WM} products</div>
            </div>
          </Link>
          <Link href="/category/FRIDGE">
            <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', cursor: 'pointer' }}>
              <div style={{ fontSize: '24px' }}>🧊</div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '8px' }}>Fridge</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B6B6B', marginTop: '2px' }}>{categoryCounts.FRIDGE} products</div>
            </div>
          </Link>
          <Link href="/category/LAPTOP">
            <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', cursor: 'pointer' }}>
              <div style={{ fontSize: '24px' }}>💻</div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '8px' }}>Laptop</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B6B6B', marginTop: '2px' }}>{categoryCounts.LAPTOP} products</div>
            </div>
          </Link>
          <Link href="/browse">
            <div style={{ background: '#fff', border: '1px dashed #CDBCDB', borderRadius: '16px', padding: '14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', cursor: 'pointer' }}>
              <div style={{ fontSize: '22px', color: '#F0743E' }}>⋯</div>
              <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '6px' }}>View All</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B6B6B', marginTop: '2px' }}>{totalProductsCount} total</div>
            </div>
          </Link>
        </div>

        {/* Popular Right Now */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 20px 12px' }}>
          <span style={{ fontSize: '16px', fontWeight: 800 }}>Popular Right Now</span>
          <Link href="/browse">
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#F0743E', cursor: 'pointer' }}>See all</span>
          </Link>
        </div>

        {/* Horizontal Card Scroll */}
        <div className="scrollx" style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '0 20px 4px' }}>
          {popularProducts.map((p) => (
            <div
              key={p.id}
              onClick={() => router.push(`/product/${p.id}`)}
              style={{ flex: '0 0 160px', background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', position: 'relative', cursor: 'pointer' }}
            >
              <div style={{ position: 'absolute', top: '18px', right: '18px', width: '28px', height: '28px', borderRadius: '50%', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>🤍</div>
              <div style={{
                height: '96px', borderRadius: '12px', background: '#F5F5F5',
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
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#F0743E', textTransform: 'uppercase', marginTop: '10px' }}>{p.brand}</div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.model}</div>
              <div style={{ fontSize: '15px', fontWeight: 800, marginTop: '8px' }}>From ₹ {p.price.toLocaleString()}</div>
              {p.diffText && (
                <div style={{ marginTop: '8px', display: 'inline-flex', background: '#E7F6ED', color: '#16A34A', fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '999px' }}>
                  {p.diffText}
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
