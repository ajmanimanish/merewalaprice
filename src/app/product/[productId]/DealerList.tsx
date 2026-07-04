'use client';

import React, { useState } from 'react';

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

  const getStockLabel = (status: string) => {
    switch (status) {
      case 'in_stock':
        return { text: 'In Stock Today', color: '#16A34A', dotColor: '#16A34A' };
      case 'limited':
        return { text: 'Limited Stock', color: '#B77400', dotColor: '#F0A63E' };
      case 'out_of_stock':
        return { text: 'Out of Stock', color: '#DC2626', dotColor: '#DC2626' };
      default:
        return { text: 'In Stock Today', color: '#16A34A', dotColor: '#16A34A' };
    }
  };

  const getHoursAgo = (updatedAt: string) => {
    const hours = Math.max(1, Math.round((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60)));
    if (hours < 24) {
      return `Updated ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    const days = Math.round(hours / 24);
    return `Updated ${days} ${days === 1 ? 'day' : 'days'} ago`;
  };

  const handleShowContact = (price: DealerPrice) => {
    setSelectedPrice(price);
    setPermissionType(null);
  };

  const handleShareNumber = async () => {
    setPermissionType('yes');
    if (selectedPrice) {
      setRevealedPriceId(selectedPrice.id);
      // Simulate sharing or record buyer request locally if needed
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          // Log permission request in buyer_requests table
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {dealerPrices.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '24px', textAlign: 'center', color: '#6B6B6B', fontWeight: 600 }}>
          No Bhopal dealers listing this model today.
        </div>
      ) : (
        dealerPrices.map((item, index) => {
          const isBestDeal = index === 0 && lowestOnlinePrice && item.price < lowestOnlinePrice;
          const stock = getStockLabel(item.stock_status);
          const timeText = getHoursAgo(item.updated_at);
          const isRevealed = revealedPriceId === item.id;

          return (
            <div
              key={item.id}
              style={{
                background: '#fff',
                border: isBestDeal ? '1.5px solid #F0743E' : '1px solid #EBEBEB',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: isBestDeal ? '0 4px 14px rgba(240,116,62,.14)' : '0 1px 3px rgba(0,0,0,.06)',
                position: 'relative',
              }}
            >
              {isBestDeal && (
                <span style={{ position: 'absolute', top: '-11px', left: '16px', background: '#FDDB48', color: '#141414', fontSize: '10px', fontWeight: 800, padding: '4px 10px', borderRadius: '999px' }}>
                  ★ BEST DEAL
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: isBestDeal ? '#F0743E' : '#E4E4E1', color: isBestDeal ? '#fff' : '#6B6B6B', fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 800 }}>{item.dealers?.shop_name || 'Sharma Electronics'}</div>
                  <div style={{ fontSize: '12px', color: '#6B6B6B', fontWeight: 600 }}>{item.dealers?.area || 'MP Nagar'}</div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800 }}>₹ {item.price.toLocaleString()}</div>
              </div>

              {/* Inclusions (chips) */}
              {item.inclusions && item.inclusions.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {item.inclusions.map((inc) => (
                    <span key={inc} style={{ fontSize: '10px', fontWeight: 700, background: '#F3ECF7', color: '#7A5CA0', padding: '5px 10px', borderRadius: '999px' }}>
                      {inc}
                    </span>
                  ))}
                </div>
              )}

              {/* Dealer card offer */}
              {(item.card_offer_bank && item.card_offer_savings) ? (
                <div style={{ 
                  marginTop: '8px', background: '#F0FDF4', 
                  borderRadius: '8px', padding: '6px 10px',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  <span style={{ fontSize: '13px' }}>💳</span>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A' }}>
                      {item.card_offer_bank} Card saves ₹{item.card_offer_savings.toLocaleString('en-IN')}
                    </span>
                    {item.card_offer_text && (
                      <div style={{ fontSize: '10px', color: '#6B6B6B' }}>{item.card_offer_text}</div>
                    )}
                  </div>
                </div>
              ) : null}
              {item.emi_available ? (
                <div style={{ 
                  marginTop: '4px', fontSize: '11px', fontWeight: 600, color: '#6B6B6B' 
                }}>
                  ✓ No-cost EMI available
                </div>
              ) : null}

              {/* Stock and Time */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stock.dotColor }}></span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: stock.color }}>{stock.text}</span>
                </div>
                <span style={{ fontSize: '11px', color: '#6B6B6B' }}>{timeText}</span>
              </div>

              {/* Show contact button or actual numbers */}
              {isRevealed ? (
                <div style={{ marginTop: '12px', background: '#FAFAF8', border: '1px solid #EBEBEB', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#6B6B6B' }}>📞 Phone:</span>
                    <a href={`tel:${item.dealers?.phone}`} style={{ fontSize: '14px', fontWeight: 800, color: '#F0743E' }}>
                      {item.dealers?.phone}
                    </a>
                  </div>
                  {item.dealers?.whatsapp && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#6B6B6B' }}>💬 WhatsApp:</span>
                      <a href={`https://wa.me/91${item.dealers?.whatsapp}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', fontWeight: 800, color: '#16A34A' }}>
                        {item.dealers?.whatsapp}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => handleShowContact(item)}
                  style={{
                    width: '100%',
                    height: isBestDeal ? '46px' : '42px',
                    marginTop: '12px',
                    background: isBestDeal ? '#F0743E' : '#fff',
                    color: isBestDeal ? '#fff' : '#F0743E',
                    border: isBestDeal ? 'none' : '1px solid #F0743E',
                    borderRadius: '12px',
                    fontFamily: 'inherit',
                    fontSize: isBestDeal ? '14px' : '13px',
                    fontWeight: 700,
                    boxShadow: isBestDeal ? '0 4px 12px rgba(240,116,62,.3)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Show Contact
                </button>
              )}
            </div>
          );
        })
      )}

      {/* Screen 4b Bottom Sheet Contact Modal */}
      {selectedPrice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,20,.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '390px', background: '#fff', borderRadius: '24px 24px 0 0', padding: '20px 22px 30px', boxShadow: '0 -8px 30px rgba(0,0,0,.15)', position: 'relative' }}>
            <button
              onClick={() => setSelectedPrice(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#6B6B6B' }}
            >
              ✕
            </button>
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#EBEBEB', margin: '0 auto 18px' }}></div>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#FBF1EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '14px' }}>🔒</div>
            <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, lineHeight: 1.25 }}>
              Share your number with {selectedPrice.dealers?.shop_name}?
            </h3>
            <p style={{ margin: '8px 0 0', fontSize: '13.5px', color: '#6B6B6B', fontWeight: 500, lineHeight: 1.5 }}>
              They'll only use it to confirm this deal. Your number is never shown publicly.
            </p>
            
            <button
              onClick={handleShareNumber}
              style={{ width: '100%', height: '52px', marginTop: '20px', background: '#F0743E', color: '#fff', border: 'none', borderRadius: '12px', fontFamily: 'inherit', fontSize: '15px', fontWeight: 700, boxShadow: '0 6px 16px rgba(240,116,62,.3)', cursor: 'pointer' }}
            >
              Yes, share my number
            </button>
            <button
              onClick={handleJustShow}
              style={{ width: '100%', height: '50px', marginTop: '12px', background: '#fff', color: '#141414', border: '1px solid #EBEBEB', borderRadius: '12px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
            >
              No, just show their number
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper mock import of supabase client
import { supabase } from '@/lib/supabase';
