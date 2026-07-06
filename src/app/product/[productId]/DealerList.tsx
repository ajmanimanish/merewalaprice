'use client';

import React, { useState } from 'react';
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
                <button
                  onClick={() => handleShowContact(item)}
                  style={{
                    width: '100%',
                    height: '48px',
                    marginTop: '12px',
                    background: '#E4632E',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '13px',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  View contact
                </button>
              )}
            </div>
          );
        }

        // Secondary dealers (collapsed rows)
        return (
          <div
            key={item.id}
            onClick={() => !isRevealed && handleShowContact(item)}
            style={{
              background: '#fff',
              border: '1px solid #EAE6DD',
              borderRadius: '18px',
              padding: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: isRevealed ? 'default' : 'pointer'
            }}
          >
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#F6F4EF', color: '#6B6963', fontSize: '13px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#16151A' }}>{item.dealers?.shop_name}</div>
              <div style={{ fontSize: '11px', color: item.stock_status === 'limited' ? '#C97C1D' : '#6B6963', fontWeight: item.stock_status === 'limited' ? 700 : 600 }}>
                {item.dealers?.area} · {item.stock_status === 'limited' ? 'Limited stock' : '4.6 rating'}
              </div>
            </div>
            <div style={{ textStyle: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#16151A' }}>₹ {item.price.toLocaleString()}</div>
              {isRevealed && (
                <a href={`tel:${item.dealers?.phone}`} style={{ fontSize: '11.5px', fontWeight: 700, color: '#E4632E' }}>
                  Call: {item.dealers?.phone}
                </a>
              )}
            </div>
            {!isRevealed && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A978E" strokeWidth="2.4" strokeLinecap="round"><polyline points="9 6 15 12 9 18"/></svg>
            )}
          </div>
        );
      })}

      {/* Screen 4b Bottom Sheet Contact Modal */}
      {selectedPrice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(22,21,26,.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '390px', background: '#fff', borderRadius: '24px 24px 0 0', padding: '20px 22px 30px', boxShadow: '0 -8px 30px rgba(0,0,0,.15)', position: 'relative' }}>
            <button
              onClick={() => setSelectedPrice(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#6B6963' }}
            >
              ✕
            </button>
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#EAE6DD', margin: '0 auto 18px' }} />
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#FBEEE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '14px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E4632E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, lineHeight: 1.25, color: '#16151A' }}>
              Share your number with {selectedPrice.dealers?.shop_name}?
            </h3>
            <p style={{ margin: '8px 0 0', fontSize: '13.5px', color: '#6B6963', fontWeight: 500, lineHeight: 1.5 }}>
              They'll only use it to confirm this deal. Your number is never shown publicly.
            </p>
            
            <button
              onClick={handleShareNumber}
              style={{ width: '100%', height: '52px', marginTop: '20px', background: '#E4632E', color: '#fff', border: 'none', borderRadius: '12px', fontFamily: 'inherit', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
            >
              Yes, share my number
            </button>
            <button
              onClick={handleJustShow}
              style={{ width: '100%', height: '50px', marginTop: '12px', background: '#fff', color: '#16151A', border: '1px solid #EAE6DD', borderRadius: '12px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
            >
              No, just show their number
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
