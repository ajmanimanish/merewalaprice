'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  model_number: string;
}

interface DealerProfile {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  categories: string[];
  is_approved: boolean;
}

interface PriceConfig {
  price: string;
  stock_status: 'in_stock' | 'out_of_stock' | 'limited';
  inclusions: string[];
  hasPrice: boolean;
  isDirty?: boolean;
  card_offer_bank?: string;
  card_offer_text?: string;
  card_offer_savings?: number;
  emi_available?: boolean;
}

interface PricesClientProps {
  initialProducts: Product[];
}

export default function PricesClient({ initialProducts }: PricesClientProps) {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<DealerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [pricingState, setPricingState] = useState<Record<string, PriceConfig>>({});
  const [activeTab, setActiveTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastUpdatedText, setLastUpdatedText] = useState('Never');
  const [saveLoading, setSaveLoading] = useState(false);

  const categories = ['All', 'AC', 'TV', 'WM', 'Fridge', 'Laptop'];
  const availableInclusions = ['Free Install', 'Free Pipe', 'Warranty', 'EMI', 'Free Delivery'];

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (!s) router.push('/dealer');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) router.push('/dealer');
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Fetch dealer profile and current prices
  useEffect(() => {
    if (!session) return;

    async function loadData() {
      setLoading(true);
      try {
        const { data: dl } = await supabase
          .from('dealers')
          .select('*')
          .or(`id.eq.${session.user.id},auth_user_id.eq.${session.user.id},email.eq.${session.user.email}`)
          .single();

        if (dl) {
          setProfile(dl);

          // Fetch dealer prices
          const { data: prices } = await supabase
            .from('dealer_prices')
            .select('*')
            .eq('dealer_id', dl.id);

          const configMap: Record<string, PriceConfig> = {};
          let latestTime = 0;

          if (prices) {
            prices.forEach((pr) => {
              configMap[pr.product_id] = {
                price: String(pr.price),
                stock_status: pr.stock_status,
                inclusions: pr.inclusions || [],
                hasPrice: true,
                isDirty: false,
                card_offer_bank: pr.card_offer_bank || '',
                card_offer_text: pr.card_offer_text || '',
                card_offer_savings: pr.card_offer_savings || 0,
                emi_available: pr.emi_available || false,
              };
              const t = new Date(pr.updated_at).getTime();
              if (t > latestTime) latestTime = t;
            });
          }

          // Filter pre-fetched products based on dealer's categories
          const matchedProducts = initialProducts.filter(p => dl.categories.includes(p.category));
          setProducts(matchedProducts);

          matchedProducts.forEach((p) => {
            if (!configMap[p.id]) {
              configMap[p.id] = {
                price: '',
                stock_status: 'in_stock',
                inclusions: [],
                hasPrice: false,
                isDirty: false,
                card_offer_bank: '',
                card_offer_text: '',
                card_offer_savings: 0,
                emi_available: false,
              };
            }
          });

          setPricingState(configMap);

          if (latestTime > 0) {
            const d = new Date(latestTime);
            setLastUpdatedText(`Today ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}`);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [session, initialProducts]);

  // Debounced Autosave Trigger
  useEffect(() => {
    const hasDirty = Object.values(pricingState).some((x) => x.isDirty);
    if (!hasDirty) return;

    setLastUpdatedText('Saving changes...');
    const timer = setTimeout(() => {
      saveAllPrices();
    }, 1500);

    return () => clearTimeout(timer);
  }, [pricingState]);

  const handlePriceChange = (productId: string, val: string) => {
    setPricingState((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        price: val,
        isDirty: true,
      },
    }));
  };

  const handleStockChange = (productId: string, status: any) => {
    setPricingState((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        stock_status: status,
        isDirty: true,
      },
    }));
  };

  const toggleInclusion = (productId: string, inc: string) => {
    setPricingState((prev) => {
      const current = prev[productId];
      const inclusions = current.inclusions.includes(inc)
        ? current.inclusions.filter((x) => x !== inc)
        : [...current.inclusions, inc];
      return {
        ...prev,
        [productId]: {
          ...current,
          inclusions,
          isDirty: true,
        },
      };
    });
  };

  const markAllInStock = () => {
    const updated = { ...pricingState };
    products.forEach((p) => {
      if (updated[p.id]) {
        updated[p.id].stock_status = 'in_stock';
        updated[p.id].isDirty = true;
      }
    });
    setPricingState(updated);
  };

  const handleAddPriceClick = (productId: string) => {
    setPricingState((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        price: '30000', // Pre-fill with a placeholder
        isDirty: true,
      },
    }));
  };

  const saveAllPrices = async () => {
    if (!profile) return;
    setSaveLoading(true);
    try {
      const inserts = [];
      const deletes = [];

      for (const [productId, config] of Object.entries(pricingState)) {
        if (!config.isDirty) continue;

        const val = parseInt(config.price);
        if (isNaN(val) || val <= 0) {
          if (config.hasPrice) {
            deletes.push(productId);
          }
        } else {
          inserts.push({
            dealer_id: profile.id,
            product_id: productId,
            price: val,
            stock_status: config.stock_status,
            inclusions: config.inclusions,
            card_offer_bank: config.card_offer_bank || null,
            card_offer_text: config.card_offer_text || null,
            card_offer_savings: config.card_offer_savings || null,
            emi_available: config.emi_available || false,
            updated_at: new Date().toISOString(),
          });
        }
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from('dealer_prices').upsert(inserts, { onConflict: 'dealer_id,product_id' });
        if (error) throw error;
      }

      if (deletes.length > 0) {
        const { error } = await supabase
          .from('dealer_prices')
          .delete()
          .eq('dealer_id', profile.id)
          .in('product_id', deletes);
        if (error) throw error;
      }

      // Update state
      const nextState = { ...pricingState };
      inserts.forEach((x) => {
        nextState[x.product_id].hasPrice = true;
        nextState[x.product_id].isDirty = false;
      });
      deletes.forEach((pid) => {
        nextState[pid].hasPrice = false;
        nextState[pid].isDirty = false;
        nextState[pid].price = '';
      });
      setPricingState(nextState);

      const now = new Date();
      setLastUpdatedText(`Today ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}`);
    } catch (e) {
      console.error(e);
    } finally {
      setSaveLoading(false);
    }
  };

  const getCatEmoji = (cat: string) => {
    switch (cat?.toUpperCase()) {
      case 'AC': return '❄️';
      case 'TV': return '📺';
      case 'WM': return '🌀';
      case 'FRIDGE': return '🧊';
      case 'LAPTOP': return '💻';
      default: return '🔌';
    }
  };

  // Filter products by tab and search query
  const filteredProducts = products.filter((p) => {
    const matchesTab = activeTab === 'All' || 
      p.category.toLowerCase() === activeTab.toLowerCase() || 
      (activeTab === 'Fridge' && p.category === 'FRIDGE');

    if (!matchesTab) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || 
           p.brand.toLowerCase().includes(q) || 
           p.model_number.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FAFAF8] md:shadow-2xl md:border-x md:border-[#EBEBEB] flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#F0743E] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-[14px] font-bold text-[#6B6B6B]">Loading Price Manager...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FDFCFA] md:shadow-2xl md:border-x md:border-[#EAE6DD] flex flex-col justify-between font-sans overflow-y-auto">
      <div className="flex flex-col">
        {/* Status Bar */}
        <StatusBar />

        {/* Back Link Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px 0' }}>
          <Link href="/dealer/dashboard">
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#E4632E', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E4632E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="20" y1="12" x2="4" y2="12"/><polyline points="10 6 4 12 10 18"/></svg>
              Back to Dashboard
            </span>
          </Link>
        </div>

        {/* Top Info */}
        <div style={{ padding: '8px 20px 6px' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#16151A' }}>
            {profile?.shop_name || 'Sharma Electronics'}
          </div>
          <div style={{ fontSize: '11px', color: '#9A978E', fontWeight: 600, marginTop: '2px' }}>
            {profile?.area || 'MP Nagar'} · Bhopal
          </div>
        </div>

        {/* Autosave / Freshness Banner */}
        <div style={{ padding: '8px 20px' }}>
          <div style={{ 
            background: lastUpdatedText === 'Saving changes...' ? '#FCF1DF' : '#E7F5EE', 
            border: lastUpdatedText === 'Saving changes...' ? '1px solid #FCF1DF' : '1px solid #C7E8D6', 
            borderRadius: '14px', 
            padding: '12px 14px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px' 
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={lastUpdatedText === 'Saving changes...' ? '#C97C1D' : '#1F8A5C'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/>
              {lastUpdatedText === 'Saving changes...' ? (
                <path d="M12 6v6l4 2" />
              ) : (
                <polyline points="8 12.5 11 15.5 16 9"/>
              )}
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 700, color: lastUpdatedText === 'Saving changes...' ? '#C97C1D' : '#1F8A5C', flex: 1 }}>
              {lastUpdatedText === 'Saving changes...' ? 'Saving changes...' : `All changes saved · fresh as of ${lastUpdatedText.replace('Today', '').trim() || 'now'}`}
            </span>
          </div>
        </div>

        {/* Category chip selector */}
        <div className="scrollx" style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '12px 20px 6px' }}>
          {categories.map((tab) => {
            const active = tab === activeTab;
            return (
              <span
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: '0 0 auto',
                  background: active ? '#E4632E' : '#fff',
                  color: active ? '#fff' : '#16151A',
                  border: active ? 'none' : '1px solid #EAE6DD',
                  fontSize: '12px',
                  fontWeight: active ? '700' : '600',
                  padding: '8px 15px',
                  borderRadius: '999px',
                  cursor: 'pointer',
                }}
              >
                {tab}
              </span>
            );
          })}
        </div>

        {/* Search input bar */}
        <div style={{ padding: '8px 20px 8px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '12px', display: 'inline-flex', alignItems: 'center', pointerEvents: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A978E" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input
              type="text"
              placeholder="Search by brand, name or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: '#fff',
                border: '1px solid #EAE6DD',
                borderRadius: '12px',
                padding: '10px 12px 10px 36px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#16151A',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <span 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '12px', fontSize: '13px', color: '#9A978E', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </span>
            )}
          </div>
        </div>

        {/* Count and quick action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 4px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#6B6963' }}>
            {filteredProducts.length} products
          </span>
          <span onClick={markAllInStock} style={{ fontSize: '12px', fontWeight: 700, color: '#E4632E', cursor: 'pointer' }}>
            Mark all In Stock
          </span>
        </div>

        {/* Product Rows List */}
        <div style={{ padding: '8px 18px 90px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredProducts.map((p) => {
            const config = pricingState[p.id] || { price: '', stock_status: 'in_stock', inclusions: [], hasPrice: false };
            const isListed = config.hasPrice || config.isDirty;
            const emoji = getCatEmoji(p.category);

            if (!isListed) {
              // Unlisted dashed card
              return (
                <div key={p.id} style={{ background: '#fff', border: '1.5px dashed #D8D2C4', borderRadius: '18px', padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '11px', background: '#F6F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0, opacity: .55 }}>
                      {emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#9A978E', textTransform: 'uppercase' }}>{p.brand}</div>
                      <div style={{ 
                        fontSize: '13.5px', 
                        fontWeight: 700, 
                        lineHeight: 1.25, 
                        color: '#9A978E',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{p.name}</div>
                      <div style={{ fontSize: '10.5px', color: '#9A978E', fontWeight: 600, marginTop: '2px' }}>
                        {p.model_number}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddPriceClick(p.id)}
                      style={{
                        flexShrink: 0,
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#FBEEE7',
                        border: 'none',
                        color: '#E4632E',
                        fontSize: '18px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            }

            // Listed row
            return (
              <div key={p.id} style={{ background: '#fff', border: '1px solid #EAE6DD', borderRadius: '18px', padding: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '11px', background: '#F6F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                    {emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#E4632E', textTransform: 'uppercase' }}>{p.brand}</div>
                    <div style={{ 
                      fontSize: '13.5px', 
                      fontWeight: 700, 
                      lineHeight: 1.25, 
                      color: '#16151A',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>{p.name}</div>
                    <div style={{ fontSize: '10.5px', color: '#9A978E', fontWeight: 600, marginTop: '2px' }}>
                      {p.model_number}
                    </div>
                  </div>
                  {config.isDirty ? (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#C97C1D', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C97C1D] animate-ping"></span>
                      Saving...
                    </span>
                  ) : (
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#1F8A5C', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1F8A5C" strokeWidth="2.8" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Saved
                    </span>
                  )}
                </div>

                {/* Edit Controls: Price Stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', background: '#F6F4EF', borderRadius: '13px', padding: '6px' }}>
                  <button 
                    type="button"
                    onClick={() => {
                      const cur = parseInt(config.price) || 0;
                      const next = Math.max(0, cur - 100);
                      handlePriceChange(p.id, String(next));
                    }}
                    style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fff', border: '1px solid #EAE6DD', fontSize: '18px', fontWeight: 800, color: '#16151A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
                  >
                    −
                  </button>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#16151A' }}>₹</span>
                    <input
                      type="number"
                      value={config.price}
                      onChange={(e) => handlePriceChange(p.id, e.target.value)}
                      style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '17px', fontWeight: 800, color: '#16151A', width: '90px', textAlign: 'center' }}
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      const cur = parseInt(config.price) || 0;
                      const next = cur + 100;
                      handlePriceChange(p.id, String(next));
                    }}
                    style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fff', border: '1px solid #EAE6DD', fontSize: '18px', fontWeight: 800, color: '#16151A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
                  >
                    +
                  </button>
                </div>

                {/* 3-way Segmented Stock Selector */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                  {(['in_stock', 'limited', 'out_of_stock'] as const).map((status) => {
                    const active = config.stock_status === status;
                    let bg = '#fff';
                    let color = '#6B6963';
                    let border = '1px solid #EAE6DD';
                    let label = 'In Stock';
                    
                    if (status === 'in_stock') {
                      label = 'In Stock';
                      if (active) {
                        bg = '#E7F5EE';
                        color = '#1F8A5C';
                        border = '1.5px solid #1F8A5C';
                      }
                    } else if (status === 'limited') {
                      label = 'Limited';
                      if (active) {
                        bg = '#FCF1DF';
                        color = '#C97C1D';
                        border = '1.5px solid #C97C1D';
                      }
                    } else if (status === 'out_of_stock') {
                      label = 'Out';
                      if (active) {
                        bg = '#FEE2E2';
                        color = '#DC2626';
                        border = '1.5px solid #DC2626';
                      }
                    }
                    
                    return (
                      <span
                        key={status}
                        onClick={() => handleStockChange(p.id, status)}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          background: bg,
                          color: color,
                          border: border,
                          fontSize: '11.5px',
                          fontWeight: active ? '700' : '600',
                          padding: '9px 4px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>

                {/* Inclusions Selector */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {availableInclusions.map((inc) => {
                    const active = config.inclusions.includes(inc);
                    return (
                      <span
                        key={inc}
                        onClick={() => toggleInclusion(p.id, inc)}
                        style={{
                          fontSize: '10.5px',
                          fontWeight: active ? '700' : '600',
                          background: active ? '#FBEEE7' : '#F6F4EF',
                          color: active ? '#E4632E' : '#6B6963',
                          border: active ? '1px solid #E4632E' : '1px solid #EAE6DD',
                          padding: '6px 11px',
                          borderRadius: '999px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {active && (
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#E4632E" strokeWidth="3.2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                        {inc}
                      </span>
                    );
                  })}
                </div>

                {/* Special Offer Section */}
                <div style={{ marginTop: '12px', borderTop: '1px dashed #EAE6DD', paddingTop: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B6963', marginBottom: '8px' }}>
                    💳 Card / EMI Offer (optional)
                  </div>
                  
                  {/* Bank name + savings row */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <select
                      value={config.card_offer_bank || ''}
                      onChange={(e) => setPricingState(prev => ({
                        ...prev,
                        [p.id]: { ...prev[p.id], card_offer_bank: e.target.value, isDirty: true }
                      }))}
                      style={{ 
                        flex: 1, background: '#fff', border: '1px solid #EAE6DD', 
                        borderRadius: '10px', padding: '8px 10px', 
                        fontSize: '12px', fontWeight: 600, color: '#16151A', outline: 'none' 
                      }}
                    >
                      <option value="">Select Bank</option>
                      <option value="HDFC">HDFC Bank</option>
                      <option value="ICICI">ICICI Bank</option>
                      <option value="SBI">SBI</option>
                      <option value="Axis">Axis Bank</option>
                      <option value="Kotak">Kotak Bank</option>
                      <option value="Yes">Yes Bank</option>
                      <option value="All">All Cards</option>
                    </select>
                    
                    <div style={{ 
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: '#fff', border: '1px solid #EAE6DD',
                      borderRadius: '10px', padding: '8px 10px', width: '110px'
                    }}>
                      <span style={{ fontSize: '12px', color: '#6B6963' }}>₹</span>
                      <input
                        type="number"
                        placeholder="0 off"
                        value={config.card_offer_savings || ''}
                        onChange={(e) => setPricingState(prev => ({
                          ...prev,
                          [p.id]: { ...prev[p.id], card_offer_savings: parseInt(e.target.value) || 0, isDirty: true }
                        }))}
                        style={{ 
                          width: '100%', border: 'none', background: 'transparent', 
                          outline: 'none', fontSize: '12px', fontWeight: 700, color: '#16151A'
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Offer description */}
                  <input
                    type="text"
                    placeholder="e.g. HDFC Credit Card pe ₹500 extra off"
                    value={config.card_offer_text || ''}
                    onChange={(e) => setPricingState(prev => ({
                      ...prev,
                      [p.id]: { ...prev[p.id], card_offer_text: e.target.value, isDirty: true }
                    }))}
                    style={{ 
                      width: '100%', background: '#fff', border: '1px solid #EAE6DD',
                      borderRadius: '10px', padding: '8px 12px', fontSize: '12px',
                      fontWeight: 500, color: '#16151A', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                  
                  {/* EMI toggle */}
                  <div 
                    onClick={() => setPricingState(prev => ({
                      ...prev,
                      [p.id]: { ...prev[p.id], emi_available: !prev[p.id]?.emi_available, isDirty: true }
                    }))}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', 
                      marginTop: '8px', cursor: 'pointer' 
                    }}
                  >
                    <div style={{ 
                      width: '36px', height: '20px', borderRadius: '999px',
                      background: config.emi_available ? '#E4632E' : '#EAE6DD',
                      position: 'relative', transition: 'background .2s',
                      flexShrink: 0
                    }}>
                      <div style={{ 
                        width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: '2px',
                        left: config.emi_available ? '18px' : '2px',
                        transition: 'left .2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,.2)'
                      }}/>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#16151A' }}>
                      No-cost EMI available
                    </span>
                  </div>
                
                  {/* Preview how it shows to buyer */}
                  {(config.card_offer_bank || config.card_offer_savings || config.emi_available) ? (
                    <div style={{ 
                      marginTop: '10px', background: '#E7F5EE', border: '1px solid #C7E8D6',
                      borderRadius: '10px', padding: '8px 12px'
                    }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#1F8A5C', marginBottom: '3px' }}>
                        PREVIEW — How buyers will see this:
                      </div>
                      {config.card_offer_bank && config.card_offer_savings ? (
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#16151A' }}>
                          💳 {config.card_offer_bank} Card: Save ₹{config.card_offer_savings.toLocaleString('en-IN')}
                        </div>
                      ) : null}
                      {config.card_offer_text && (
                        <div style={{ fontSize: '11px', color: '#6B6963', marginTop: '2px' }}>
                          {config.card_offer_text}
                        </div>
                      )}
                      {config.emi_available && (
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#1F8A5C', marginTop: '2px' }}>
                          ✓ No-cost EMI available
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
