'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  model_number: string;
  image_url?: string;
}

interface BuyerRequest {
  id: string;
  budget: number;
  area: string;
  urgency: string;
  whats_different?: string;
  status: string;
}

interface Dealer {
  shop_name: string;
  owner_name: string;
  phone: string;
  whatsapp: string;
  area: string;
}

interface DealerOffer {
  id: string;
  price: number;
  inclusions: string[];
  availability: string;
  note?: string;
  status: string;
  dealers: Dealer;
}

export default function RequestStatusPage({ params }: { params: { productId: string } }) {
  const { productId } = params;
  const [product, setProduct] = useState<Product | null>(null);
  const [request, setRequest] = useState<BuyerRequest | null>(null);
  const [offers, setOffers] = useState<DealerOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptedOfferId, setAcceptedOfferId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch product
        const { data: prod } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();
        if (prod) setProduct(prod);

        // Fetch user's latest request for this product from localstorage info
        const savedPhone = localStorage.getItem('buyer_phone');
        
        let reqQuery = supabase
          .from('buyer_requests')
          .select('*')
          .eq('product_id', productId)
          .order('created_at', { ascending: false });

        if (savedPhone) {
          reqQuery = reqQuery.eq('buyer_phone', savedPhone);
        }

        const { data: reqs } = await reqQuery.limit(1);

        if (reqs && reqs[0]) {
          const activeReq = reqs[0];
          setRequest(activeReq);

          // Fetch dealer offers for this request
          const { data: offData } = await supabase
            .from('dealer_offers')
            .select('*, dealers(shop_name, owner_name, phone, whatsapp, area)')
            .eq('request_id', activeReq.id)
            .order('price', { ascending: true });

          if (offData) {
            setOffers(offData as any[]);
            const accepted = offData.find((o) => o.status === 'accepted');
            if (accepted) setAcceptedOfferId(accepted.id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [productId]);

  const handleAcceptOffer = async (offerId: string) => {
    try {
      // Update offer status
      const { error } = await supabase
        .from('dealer_offers')
        .update({ status: 'accepted' })
        .eq('id', offerId);

      if (error) throw error;

      // Update buyer request status to fulfilled
      if (request) {
        await supabase
          .from('buyer_requests')
          .update({ status: 'fulfilled' })
          .eq('id', request.id);
      }

      setAcceptedOfferId(offerId);
      setOffers(offers.map(o => o.id === offerId ? { ...o, status: 'accepted' } : o));
      alert('Offer accepted! You can now contact the dealer directly.');
    } catch (e) {
      console.error(e);
      alert('Error accepting offer. Please try again.');
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

  if (loading) {
    return (
      <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FAFAF8] md:shadow-2xl md:border-x md:border-[#EBEBEB] flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#F0743E] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-[14px] font-bold text-[#6B6B6B]">Loading offers...</span>
        </div>
      </div>
    );
  }

  if (!product || !request) {
    return (
      <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FAFAF8] md:shadow-2xl md:border-x md:border-[#EBEBEB] flex items-center justify-center font-sans">
        <div className="text-center p-6">
          <div className="text-4xl mb-2">📩</div>
          <span className="text-[14px] font-bold text-[#141414]">No active special requests found for this model.</span>
          <div className="mt-4">
            <Link href="/" className="text-xs font-bold text-[#F0743E]">
              Go to Home →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FAFAF8] md:shadow-2xl md:border-x md:border-[#EBEBEB] flex flex-col justify-between font-sans overflow-y-auto">
      <div className="flex flex-col">
        {/* Status Bar */}
        <StatusBar />

        {/* Back Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 18px 12px' }}>
          <Link href={`/product/${productId}`}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#fff', border: '1px solid #EBEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', cursor: 'pointer' }}>
              ←
            </div>
          </Link>
          <span style={{ fontSize: '17px', fontWeight: 800 }}>Request Status</span>
        </div>

        {/* Info Card */}
        <div style={{ padding: '0 20px 14px' }}>
          <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                {getCatEmoji(product.category)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 800 }}>{product.name}</div>
                <div style={{ fontSize: '11px', color: '#6B6B6B' }}>
                  Budget ₹ {request.budget.toLocaleString()} · {request.area}
                </div>
              </div>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  background: request.status === 'fulfilled' ? '#E7F6ED' : '#FBF1EB',
                  color: request.status === 'fulfilled' ? '#16A34A' : '#B77400',
                  padding: '4px 9px',
                  borderRadius: '999px',
                }}
              >
                {request.status === 'fulfilled' ? 'Fulfilled' : 'Open'}
              </span>
            </div>
            {request.whats_different && (
              <div style={{ marginTop: '10px', padding: '8px 10px', background: '#FAFAF8', borderRadius: '8px', fontSize: '11px', color: '#6B6B6B' }}>
                <strong>Custom:</strong> {request.whats_different}
              </div>
            )}
          </div>
        </div>

        {/* Live Offers Header */}
        <div style={{ padding: '6px 20px 6px' }}>
          <div style={{ fontSize: '15px', fontWeight: 800 }}>
            Live Dealer Offers <span style={{ color: '#F0743E' }}>({offers.length})</span>
          </div>
        </div>

        {/* Offers List */}
        <div style={{ padding: '6px 20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {offers.length === 0 ? (
            <div style={{ background: '#fff', border: '1px dashed #EBEBEB', borderRadius: '16px', padding: '28px', textAlign: 'center', color: '#6B6B6B' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🕒</div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>Waiting for dealers to respond...</div>
              <div style={{ fontSize: '11.5px', marginTop: '3px' }}>Dealers in Bhopal are reviewing your request. We'll update you as soon as they respond!</div>
            </div>
          ) : (
            offers.map((o) => {
              const isAccepted = o.id === acceptedOfferId;
              const hasAcceptedAny = acceptedOfferId !== null;

              return (
                <div
                  key={o.id}
                  style={{
                    background: '#fff',
                    border: isAccepted ? '1.5px solid #16A34A' : '1px solid #EBEBEB',
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 800 }}>{o.dealers?.shop_name}</div>
                      <div style={{ fontSize: '11px', color: '#6B6B6B' }}>{o.dealers?.area} · Stock: {o.availability}</div>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#141414' }}>
                      ₹ {o.price.toLocaleString()}
                    </div>
                  </div>

                  {o.inclusions && o.inclusions.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                      {o.inclusions.map((inc) => (
                        <span key={inc} style={{ fontSize: '9.5px', fontWeight: 700, background: '#F3ECF7', color: '#7A5CA0', padding: '4px 8px', borderRadius: '999px' }}>
                          {inc}
                        </span>
                      ))}
                    </div>
                  )}

                  {o.note && (
                    <div style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '10px', background: '#FAFAF8', padding: '8px 10px', borderRadius: '8px' }}>
                      💬 "{o.note}"
                    </div>
                  )}

                  {isAccepted ? (
                    <div style={{ marginTop: '12px', background: '#E7F6ED', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#16803D' }}>✓ Deal accepted! Contact details:</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: '#6B6B6B' }}>Phone:</span>
                        <a href={`tel:${o.dealers?.phone}`} style={{ fontSize: '13px', fontWeight: 800, color: '#16803D' }}>{o.dealers?.phone}</a>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: '#6B6B6B' }}>WhatsApp:</span>
                        <a href={`https://wa.me/91${o.dealers?.whatsapp}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', fontWeight: 800, color: '#16A34A' }}>{o.dealers?.whatsapp}</a>
                      </div>
                    </div>
                  ) : (
                    !hasAcceptedAny && (
                      <button
                        onClick={() => handleAcceptOffer(o.id)}
                        style={{ width: '100%', height: '42px', marginTop: '12px', background: '#F0743E', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'inherit', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Accept Deal & Contact
                      </button>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
