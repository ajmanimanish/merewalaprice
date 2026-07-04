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

export default function DealerPricesPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<DealerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [pricingState, setPricingState] = useState<Record<string, PriceConfig>>({});
  const [activeTab, setActiveTab] = useState<string>('All');
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

  // Fetch products and current prices
  useEffect(() => {
    if (!session) return;

    async function loadData() {
      setLoading(true);
      try {
        const { data: dl } = await supabase
          .from('dealers')
          .select('*')
          .or(`id.eq.${session.user.id},auth_user_id.eq.${session.user.id},owner_email.eq.${session.user.email}`)
          .single();

        if (dl) {
          setProfile(dl);

          // Fetch products matching dealer's categories
          const { data: prods } = await supabase
            .from('products')
            .select('*')
            .in('category', dl.categories)
            .eq('is_active', true);

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

          if (prods) {
            prods.forEach((p) => {
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
            setProducts(prods);
          }

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
  }, [session]);

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
      alert('All changes saved successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save prices. Please try again.');
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

  // Filter products by tab
  const filteredProducts = products.filter((p) => {
    if (activeTab === 'All') return true;
    return p.category.toLowerCase() === activeTab.toLowerCase() || (activeTab === 'Fridge' && p.category === 'FRIDGE');
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
    <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FAFAF8] md:shadow-2xl md:border-x md:border-[#EBEBEB] flex flex-col justify-between font-sans overflow-y-auto">
      <div className="flex flex-col">
        {/* Status Bar */}
        <StatusBar />

        {/* Back Link Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 20px 0' }}>
          <Link href="/dealer/dashboard">
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#F0743E', cursor: 'pointer' }}>← Back to Dashboard</span>
          </Link>
        </div>

        {/* Top Info */}
        <div style={{ padding: '6px 20px 6px' }}>
          <div style={{ fontSize: '18px', fontWeight: 800 }}>My Price List</div>
          <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700, marginTop: '2px' }}>
            Last updated: {lastUpdatedText} ✓
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
                  background: active ? '#F0743E' : '#fff',
                  color: active ? '#fff' : '#141414',
                  border: active ? 'none' : '1px solid #EBEBEB',
                  fontSize: '12px',
                  fontWeight: active ? '700' : '600',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  cursor: 'pointer',
                }}
              >
                {tab}
              </span>
            );
          })}
        </div>

        {/* Count and quick action */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 4px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#6B6B6B' }}>
            {filteredProducts.length} products
          </span>
          <span onClick={markAllInStock} style={{ fontSize: '12px', fontWeight: 700, color: '#F0743E', cursor: 'pointer' }}>
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
                <div key={p.id} style={{ background: '#fff', border: '1px dashed #CDBCDB', borderRadius: '16px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0, opacity: .6 }}>
                      {emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '9px', fontWeight: 800, color: '#6B6B6B', textTransform: 'uppercase' }}>{p.brand}</div>
                      <div style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: '10.5px', color: '#6B6B6B' }}>{p.model_number}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddPriceClick(p.id)}
                    style={{ width: '100%', height: '40px', marginTop: '12px', background: '#fff', color: '#F0743E', border: '1.5px solid #F0743E', borderRadius: '10px', fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Add my price
                  </button>
                </div>
              );
            }

            // Listed row
            return (
              <div key={p.id} style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                    {emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#F0743E', textTransform: 'uppercase' }}>{p.brand}</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize: '10.5px', color: '#6B6B6B' }}>{p.model_number}</div>
                  </div>
                  {config.isDirty ? (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#F0743E' }}>Editing...</span>
                  ) : (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#16A34A' }}>Saved ✓</span>
                  )}
                </div>

                {/* Edit Controls */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <div style={{ flex: 1, background: '#FAFAF8', border: '1.5px solid #F0743E', borderRadius: '10px', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#6B6B6B' }}>₹</span>
                    <input
                      type="number"
                      value={config.price}
                      onChange={(e) => handlePriceChange(p.id, e.target.value)}
                      style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', fontWeight: 800, color: '#141414' }}
                    />
                  </div>

                  <select
                    value={config.stock_status}
                    onChange={(e) => handleStockChange(p.id, e.target.value as any)}
                    style={{ background: '#FAFAF8', border: '1px solid #EBEBEB', borderRadius: '10px', padding: '9px 12px', fontSize: '12px', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="in_stock">🟢 In Stock</option>
                    <option value="limited">🟡 Limited</option>
                    <option value="out_of_stock">🔴 Out of Stock</option>
                  </select>
                </div>

                {/* Inclusions selectors */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                  {availableInclusions.map((inc) => {
                    const active = config.inclusions.includes(inc);
                    return (
                      <span
                        key={inc}
                        onClick={() => toggleInclusion(p.id, inc)}
                        style={{
                          fontSize: '10px',
                          fontWeight: active ? '700' : '600',
                          background: active ? '#FBF1EB' : '#FAFAF8',
                          color: active ? '#F0743E' : '#6B6B6B',
                          border: active ? '1px solid #F0743E' : '1px solid #EBEBEB',
                          padding: '5px 10px',
                          borderRadius: '999px',
                          cursor: 'pointer',
                        }}
                      >
                        ✓ {inc}
                      </span>
                    );
                  })}
                </div>

                {/* Special Offer Section */}
                <div style={{ marginTop: '12px', borderTop: '1px dashed #EBEBEB', paddingTop: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B6B6B', marginBottom: '8px' }}>
                    💳 My Card / EMI Offer (optional)
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
                        flex: 1, background: '#FAFAF8', border: '1px solid #EBEBEB', 
                        borderRadius: '10px', padding: '8px 10px', 
                        fontSize: '12px', fontWeight: 600, outline: 'none' 
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
                      background: '#FAFAF8', border: '1px solid #EBEBEB',
                      borderRadius: '10px', padding: '8px 10px', width: '110px'
                    }}>
                      <span style={{ fontSize: '12px', color: '#6B6B6B' }}>₹</span>
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
                          outline: 'none', fontSize: '12px', fontWeight: 700 
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
                      width: '100%', background: '#FAFAF8', border: '1px solid #EBEBEB',
                      borderRadius: '10px', padding: '8px 12px', fontSize: '12px',
                      fontWeight: 500, outline: 'none', boxSizing: 'border-box'
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
                      background: config.emi_available ? '#F0743E' : '#EBEBEB',
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
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#141414' }}>
                      No-cost EMI available
                    </span>
                  </div>
                
                  {/* Preview how it shows to buyer */}
                  {(config.card_offer_bank || config.card_offer_savings || config.emi_available) ? (
                    <div style={{ 
                      marginTop: '10px', background: '#F0FDF4', border: '1px solid #86EFAC',
                      borderRadius: '10px', padding: '8px 12px'
                    }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#16A34A', marginBottom: '3px' }}>
                        PREVIEW — How buyers will see this:
                      </div>
                      {config.card_offer_bank && config.card_offer_savings ? (
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#141414' }}>
                          💳 {config.card_offer_bank} Card: Save ₹{config.card_offer_savings.toLocaleString('en-IN')}
                        </div>
                      ) : null}
                      {config.card_offer_text && (
                        <div style={{ fontSize: '11px', color: '#6B6B6B', marginTop: '2px' }}>
                          {config.card_offer_text}
                        </div>
                      )}
                      {config.emi_available && (
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#16A34A', marginTop: '2px' }}>
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

      {/* Sticky Save All bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 'calc(50% - 195px)', width: '100%', maxWidth: '390px', padding: '12px 20px 24px', background: 'linear-gradient(#FAFAF8bb, #FAFAF8)', zIndex: 40 }}>
        <button
          onClick={saveAllPrices}
          disabled={saveLoading}
          style={{ width: '100%', height: '52px', background: '#F0743E', color: '#fff', border: 'none', borderRadius: '12px', fontFamily: 'inherit', fontSize: '15px', fontWeight: 700, boxShadow: '0 6px 16px rgba(240,116,62,.3)', cursor: 'pointer' }}
        >
          {saveLoading ? 'Saving changes...' : 'Save All'}
        </button>
      </div>
    </div>
  );
}
