'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Dealer {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  whatsapp: string;
  area: string;
  city: string;
}

interface DealerPrice {
  id: string;
  dealer_id: string;
  product_id: string;
  price: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'limited';
  inclusions: string[];
  notes?: string;
  updated_at: string;
  dealers: Dealer;
  card_offer_bank?: string;
  card_offer_text?: string;
  card_offer_savings?: number;
  emi_available?: boolean;
}

interface DealerListProps {
  dealerPrices: DealerPrice[];
  lowestOnlinePrice?: number;
  productName: string;
}

export default function DealerList({ dealerPrices, lowestOnlinePrice, productName }: DealerListProps) {
  const [selectedPrice, setSelectedPrice] = useState<DealerPrice | null>(null);
  const [permissionType, setPermissionType] = useState<'yes' | 'no' | null>(null);
  const [revealedPriceId, setRevealedPriceId] = useState<string | null>(null);

  const [showLockModal, setShowLockModal] = useState<string | null>(null);
  const [lockName, setLockName] = useState('');
  const [lockPhone, setLockPhone] = useState('');
  const [sharePhone, setSharePhone] = useState(true);
  const [lockLoading, setLockLoading] = useState(false);
  const [lockSuccess, setLockSuccess] = useState(false);
  const [interestCounts, setInterestCounts] = useState<Record<string, number>>({});

  const productId = dealerPrices[0]?.product_id;

  // Prefill from auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setLockName(session.user.user_metadata?.full_name || '');
      }
    });
  }, []);

  // Fetch real-time active interest counts
  useEffect(() => {
    const fetchInterestCounts = async () => {
      try {
        const { data } = await supabase
          .from('price_locks')
          .select('dealer_id')
          .eq('product_id', productId)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString());
        if (data) {
          const counts: Record<string, number> = {};
          data.forEach((lock: any) => {
            counts[lock.dealer_id] = (counts[lock.dealer_id] || 0) + 1;
          });
          setInterestCounts(counts);
        }
      } catch (err) {
        console.error('Error fetching interest counts:', err);
      }
    };
    if (productId) {
      fetchInterestCounts();
    }
  }, [productId]);

  const handleLockPrice = async () => {
    if (!lockName || lockPhone.length < 10 || !showLockModal) return;
    setLockLoading(true);
    const dp = dealerPrices.find(d => d.dealer_id === showLockModal);
    if (!dp) return;

    try {
      const res = await fetch('/api/price-locks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          dealer_id: showLockModal,
          buyer_name: lockName,
          buyer_phone: lockPhone,
          locked_price: dp.price,
          phone_shared: sharePhone,
        })
      });
      if (res.ok) {
        setLockSuccess(true);
        // Snappy UI count update
        setInterestCounts(prev => ({
          ...prev,
          [showLockModal]: (prev[showLockModal] || 0) + 1
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLockLoading(false);
    }
  };

  const getStockLabel = (status: string) => {
    switch (status) {
      case 'in_stock':
        return { text: 'In stock today', color: '#1F8A5C', dotColor: '#1F8A5C' };
      case 'limited':
        return { text: 'Limited stock', color: '#C97C1D', dotColor: '#C97C1D' };
      case 'out_of_stock':
        return { text: 'Out of stock', color: '#DC2626', dotColor: '#DC2626' };
      default:
        return { text: 'In stock today', color: '#1F8A5C', dotColor: '#1F8A5C' };
    }
  };

  const getHoursAgo = (updatedAt: string) => {
    const hours = Math.max(1, Math.round((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60)));
    if (hours < 24) {
      return `Updated ${hours}h ago`;
    }
    const days = Math.round(hours / 24);
    return `Updated ${days}d ago`;
  };

  const getInitials = (name: string) => {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleShowContact = (price: DealerPrice) => {
    setSelectedPrice(price);
    setPermissionType(null);
  };

  const handleShareNumber = async () => {
    setPermissionType('yes');
    if (selectedPrice) {
      setRevealedPriceId(selectedPrice.id);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          await supabase.from('buyer_requests').insert({
            product_id: selectedPrice.product_id,
            user_id: userData.user.id,
            status: 'pending',
            target_price: selectedPrice.price,
            phone_shared: true,
          });
        }
      } catch (e) {
        console.error('Error logging shared number:', e);
      }
    }
  };

  const handleJustShow = () => {
    setPermissionType('no');
    if (selectedPrice) {
      setRevealedPriceId(selectedPrice.id);
    }
  };

  if (dealerPrices.length === 0) {
    return (
      <div style={{ background: '#fff', border: '1px solid #EAE6DD', borderRadius: '16px', padding: '24px', textAlign: 'center', color: '#6B6963', fontWeight: 600, fontSize: '13px' }}>
        No Bhopal dealers listing this model today.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {dealerPrices.map((item, index) => {
        const isBestDeal = index === 0;
        const stock = getStockLabel(item.stock_status);
        const timeText = getHoursAgo(item.updated_at);
        const isRevealed = revealedPriceId === item.id;
        const initials = getInitials(item.dealers?.shop_name || 'Dealer');

        if (isBestDeal) {
          return (
            <div
              key={item.id}
              style={{
                background: '#fff',
                border: '1.5px solid #E4632E',
                borderRadius: '18px',
                padding: '16px',
                boxShadow: '0 10px 26px -10px rgba(228,99,46,.4)',
                position: 'relative',
              }}
            >
              <span style={{ position: 'absolute', top: '-11px', left: '16px', background: '#F6C453', color: '#16151A', fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#16151A"><path d="M12 2l2.9 6.6L22 9.3l-5 4.9 1.2 7.1L12 17.9 5.8 21.3 7 14.2 2 9.3l7.1-.7L12 2z"/></svg>
                BEST DEAL
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#E4632E', color: '#fff', fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#16151A' }}>{item.dealers?.shop_name}</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1F8A5C" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="8 12.5 11 15.5 16 9"/></svg>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#6B6963', fontWeight: 600 }}>{item.dealers?.area} · 4.8 rating</div>
                </div>
                <div style={{ fontSize: '23px', fontWeight: 800, color: '#16151A' }}>₹ {item.price.toLocaleString()}</div>
              </div>

              {/* Inclusions (chips) */}
              {item.inclusions && item.inclusions.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {item.inclusions.map((inc) => (
                    <span key={inc} style={{ fontSize: '10px', fontWeight: 700, background: '#F1ECF7', color: '#6E5A99', padding: '5px 10px', borderRadius: '999px' }}>
                      {inc}
                    </span>
                  ))}
                </div>
              )}

              {/* Card / EMI offer previews */}
              {(item.card_offer_bank && item.card_offer_savings) ? (
                <div style={{ 
                  marginTop: '10px', background: '#E7F5EE', border: '1px solid #C7E8D6',
                  borderRadius: '10px', padding: '8px 12px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#16151A' }}>
                    💳 {item.card_offer_bank} Card saves ₹{item.card_offer_savings.toLocaleString('en-IN')}
                  </div>
                  {item.card_offer_text && (
                    <div style={{ fontSize: '11px', color: '#6B6963', marginTop: '2px' }}>{item.card_offer_text}</div>
                  )}
                </div>
              ) : null}
              {item.emi_available ? (
                <div style={{ 
                  marginTop: '8px', fontSize: '11.5px', fontWeight: 600, color: '#1F8A5C' 
                }}>
                  ✓ No-cost EMI available
                </div>
              ) : null}

              {/* Stock and Time */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: stock.dotColor }}></span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: stock.color }}>{stock.text}</span>
                </div>
                <span style={{ fontSize: '11px', color: '#9A978E', fontWeight: 600 }}>{timeText}</span>
              </div>

              {/* Contact area */}
              {isRevealed ? (
                <div style={{ marginTop: '12px', background: '#F6F4EF', border: '1px solid #EAE6DD', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#6B6963' }}>📞 Phone:</span>
                    <a href={`tel:${item.dealers?.phone}`} style={{ fontSize: '14px', fontWeight: 800, color: '#E4632E' }}>
                      {item.dealers?.phone}
                    </a>
                  </div>
                  {item.dealers?.whatsapp && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#6B6963' }}>💬 WhatsApp:</span>
                      <a href={`https://wa.me/91${item.dealers?.whatsapp}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', fontWeight: 800, color: '#1F8A5C' }}>
                        {item.dealers?.whatsapp}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ width: '100%' }}>
                  <button
                    onClick={() => setShowLockModal(item.dealer_id)}
                    style={{
                      marginTop: '12px', width: '100%', height: '48px',
                      background: '#E4632E', color: '#fff', border: 'none',
                      borderRadius: '12px', fontSize: '15px', fontWeight: 700,
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: '8px'
                    }}
                  >
                    🔒 Contact & Lock Price
                  </button>
                  {(interestCounts[item.dealer_id] || 0) > 0 && (
                    <div style={{ fontSize: '11px', color: '#6B6B6B', textAlign: 'center', marginTop: '4px' }}>
                      {interestCounts[item.dealer_id]} buyer{(interestCounts[item.dealer_id] || 0) > 1 ? 's' : ''} interested today
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }

        // Secondary dealers (collapsed rows)
        return (
          <div
            key={item.id}
            onClick={() => setShowLockModal(item.dealer_id)}
            style={{
              background: '#fff',
              border: '1px solid #EAE6DD',
              borderRadius: '18px',
              padding: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer'
            }}
          >
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#F6F4EF', color: '#6B6963', fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#16151A' }}>{item.dealers?.shop_name}</div>
              <div style={{ fontSize: '11px', color: item.stock_status === 'limited' ? '#C97C1D' : '#6B6963', fontWeight: item.stock_status === 'limited' ? 700 : 600 }}>
                {item.dealers?.area} · {item.stock_status === 'limited' ? 'Limited stock' : '4.8 rating'}
              </div>
            </div>
            <div style={{ textStyle: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#16151A' }}>₹ {item.price.toLocaleString()}</div>
              {(interestCounts[item.dealer_id] || 0) > 0 && (
                <span style={{ fontSize: '10.5px', color: '#6B6B6B', fontWeight: 600 }}>
                  🔥 {interestCounts[item.dealer_id]} interested
                </span>
              )}
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A978E" strokeWidth="2.4" strokeLinecap="round"><polyline points="9 6 15 12 9 18"/></svg>
          </div>
        );
      })}

      {/* Screen 4b Bottom Sheet Lock Price Modal */}
      {showLockModal && (() => {
        const dp = dealerPrices.find(d => d.dealer_id === showLockModal);
        if (!dp) return null;
        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(22,21,26,.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => {
              setShowLockModal(null);
              setLockSuccess(false);
            }}
          >
            <div
              style={{ background: '#fff', width: '100%', borderRadius: '24px 24px 0 0', padding: '24px', paddingBottom: '40px', maxWidth: '420px', margin: '0 auto', boxShadow: '0 -8px 30px rgba(0,0,0,.15)', position: 'relative' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setShowLockModal(null);
                  setLockSuccess(false);
                }}
                style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#6B6963' }}
              >
                ✕
              </button>
              <div style={{ width: '40px', height: '4px', background: '#EBEBEB', borderRadius: '999px', margin: '0 auto 20px' }}/>
              
              {/* Price confirmation */}
              <div style={{ background: '#F0FDF4', border: '1px solid #B7E4C7', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', color: '#6B6B6B', fontWeight: 600 }}>Lock this price for 4 hours</div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#141414', margin: '4px 0' }}>
                  ₹{dp.price.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>
                  {dp.dealers?.shop_name} · {dp.dealers?.area} · ✅ In Stock
                </div>
                {dp.inclusions?.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#6B6B6B', marginTop: '4px' }}>
                    Includes: {dp.inclusions.join(', ')}
                  </div>
                )}
              </div>

              {!lockSuccess ? (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Your name</label>
                    <input
                      type="text"
                      placeholder="Rahul Sharma"
                      value={lockName}
                      onChange={e => setLockName(e.target.value)}
                      style={{ width: '100%', height: '46px', border: '1px solid #EBEBEB', borderRadius: '10px', padding: '0 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Your phone number</label>
                    <input
                      type="tel"
                      placeholder="9826XXXXXX"
                      value={lockPhone}
                      onChange={e => setLockPhone(e.target.value)}
                      style={{ width: '100%', height: '46px', border: '1px solid #EBEBEB', borderRadius: '10px', padding: '0 14px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Phone sharing toggle */}
                  <div
                    onClick={() => setSharePhone(!sharePhone)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', cursor: 'pointer' }}
                  >
                    <div style={{ width: '44px', height: '24px', borderRadius: '999px', background: sharePhone ? '#E4632E' : '#EBEBEB', position: 'relative', flexShrink: 0, transition: 'background .2s' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: sharePhone ? '22px' : '2px', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }}/>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>Share my number with dealer</div>
                      <div style={{ fontSize: '11px', color: '#6B6B6B' }}>Dealer can call you to confirm</div>
                    </div>
                  </div>

                  <button
                    onClick={handleLockPrice}
                    disabled={!lockName || lockPhone.length < 10 || lockLoading}
                    style={{ width: '100%', height: '52px', background: lockName && lockPhone.length >= 10 ? '#E4632E' : '#EBEBEB', color: lockName && lockPhone.length >= 10 ? '#fff' : '#6B6B6B', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', transition: 'background .2s' }}
                  >
                    {lockLoading ? 'Locking...' : '🔒 Lock Price for 4 Hours'}
                  </button>
                  <div style={{ fontSize: '11px', color: '#6B6B6B', textAlign: 'center', marginTop: '10px' }}>
                    No payment required. Price is guaranteed by dealer.
                  </div>
                </>
              ) : (
                /* Success state */
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Price Locked!</div>
                  <div style={{ fontSize: '14px', color: '#6B6B6B', marginBottom: '20px', lineHeight: 1.5 }}>
                    ₹{dp.price.toLocaleString('en-IN')} guaranteed for 4 hours.<br/>
                    {dp.dealers?.shop_name} will contact you shortly.
                  </div>
                  
                  <a
                    href={`tel:${dp.dealers?.phone}`}
                    style={{ display: 'block', width: '100%', height: '52px', background: '#141414', color: '#fff', borderRadius: '12px', fontSize: '15px', fontWeight: 700, textDecoration: 'none', lineHeight: '52px', textAlign: 'center' }}
                  >
                    📞 Call {dp.dealers?.shop_name} Now
                  </a>
                  <button
                    onClick={() => {
                      setShowLockModal(null);
                      setLockSuccess(false);
                    }}
                    style={{ marginTop: '12px', background: 'none', border: 'none', color: '#6B6B6B', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    I'll wait for their call
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
