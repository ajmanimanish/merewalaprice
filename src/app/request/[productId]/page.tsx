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
  image_url?: string;
}

export default function SpecialRequestPage({ params }: { params: { productId: string } }) {
  const { productId } = params;
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [whatsDifferent, setWhatsDifferent] = useState('Different capacity (1T / 2T instead of 1.5T)');
  const [budget, setBudget] = useState(38000);
  const [area, setArea] = useState('Arera Colony');
  const [urgency, setUrgency] = useState('Today');
  const [phone, setPhone] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (data) {
          setProduct(data);
          // Set initial budget based on product category average
          if (data.category === 'AC') setBudget(38000);
          else if (data.category === 'TV') setBudget(29000);
          else if (data.category === 'FRIDGE') setBudget(24000);
          else if (data.category === 'WM') setBudget(18000);
          else setBudget(45000);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !buyerName) {
      alert('Please enter your name and phone number');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create a buyer request
      const { data, error } = await supabase
        .from('buyer_requests')
        .insert({
          product_id: productId,
          buyer_name: buyerName,
          buyer_phone: phone,
          budget: budget,
          area: area,
          urgency: urgency,
          whats_different: whatsDifferent,
          status: 'open',
          expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days expiration
        })
        .select()
        .single();

      if (error) throw error;

      // Save buyer info to localStorage for convenience
      localStorage.setItem('buyer_name', buyerName);
      localStorage.setItem('buyer_phone', phone);
      localStorage.setItem('buyer_area', area);

      // Redirect to the status page
      router.push(`/request/${productId}/status`);
    } catch (e) {
      console.error(e);
      alert('Error submitting request. Please try again.');
    } finally {
      setSubmitting(false);
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
          <span className="text-[14px] font-bold text-[#6B6B6B]">Loading...</span>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FAFAF8] md:shadow-2xl md:border-x md:border-[#EBEBEB] flex items-center justify-center font-sans">
        <div className="text-center p-6">
          <div className="text-4xl mb-2">⚠️</div>
          <span className="text-[14px] font-bold text-[#141414]">Product not found.</span>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 18px 12px' }}>
          <Link href={`/product/${productId}`}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#fff', border: '1px solid #EBEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', cursor: 'pointer' }}>
              ←
            </div>
          </Link>
          <span style={{ fontSize: '17px', fontWeight: 800 }}>Post Special Request</span>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '4px 20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Product Summary */}
          <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '12px', display: 'flex', gap: '12px', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} style={{ height: '70%', objectFit: 'contain' }} />
              ) : (
                getCatEmoji(product.category)
              )}
            </div>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 800, color: '#F0743E', textTransform: 'uppercase' }}>{product.brand}</div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, marginTop: '2px' }}>{product.name}</div>
              <div style={{ fontSize: '11px', color: '#6B6B6B' }}>{product.model_number}</div>
            </div>
          </div>

          {/* What's different */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: 700 }}>What's different about what you need?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {[
                'Different capacity (1T / 2T instead of 1.5T)',
                'Different colour or finish',
                'Specific year / model variant',
                'Special feature (WiFi, HEPA filter…)',
                'Other',
              ].map((option) => {
                const active = whatsDifferent === option;
                return (
                  <div
                    key={option}
                    onClick={() => setWhatsDifferent(option)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: active ? '#F0743E' : '#fff',
                      border: active ? '1.5px solid #F0743E' : '1px solid #EBEBEB',
                      borderRadius: '12px',
                      padding: '13px 14px',
                      cursor: 'pointer',
                      color: active ? '#fff' : '#141414',
                    }}
                  >
                    <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid ' + (active ? '#fff' : '#D8D7D1'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {active && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }}></span>}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: active ? '700' : '600' }}>{option}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Budget */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: 700 }}>Your budget</label>
            <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '12px', padding: '14px', marginTop: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '22px', fontWeight: 800 }}>₹ {budget.toLocaleString()}</span>
                <span style={{ fontSize: '12px', color: '#6B6B6B', fontWeight: 600 }}>approx.</span>
              </div>
              <input
                type="range"
                min={10000}
                max={150000}
                step={1000}
                value={budget}
                onChange={(e) => setBudget(parseInt(e.target.value))}
                style={{ width: '100%', marginTop: '14px', accentColor: '#F0743E', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: '#6B6B6B', fontWeight: 600 }}>
                <span>₹ 10,000</span>
                <span>₹ 1,50,000</span>
              </div>
            </div>
          </div>

          {/* Area */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: 700 }}>Your area in Bhopal</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              style={{ width: '100%', background: '#fff', border: '1px solid #EBEBEB', borderRadius: '12px', padding: '14px', marginTop: '10px', fontSize: '14px', fontWeight: 600, outline: 'none', appearance: 'none', cursor: 'pointer' }}
            >
              <option value="Arera Colony">Arera Colony</option>
              <option value="MP Nagar">MP Nagar</option>
              <option value="Bittan Market">Bittan Market</option>
              <option value="Kolar Road">Kolar Road</option>
              <option value="Gulmohar">Gulmohar</option>
              <option value="Indrapuri">Indrapuri</option>
              <option value="Lalghati">Lalghati</option>
              <option value="Koh-e-Fiza">Koh-e-Fiza</option>
            </select>
            <div style={{ fontSize: '11px', color: '#6B6B6B', marginTop: '6px' }}>📍 Powered by Ola Maps</div>
          </div>

          {/* Urgency */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: 700 }}>Urgency</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              {['Today', 'This week', 'Just checking'].map((time) => {
                const active = time === urgency;
                return (
                  <div
                    key={time}
                    onClick={() => setUrgency(time)}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      background: active ? '#F0743E' : '#fff',
                      color: active ? '#fff' : '#141414',
                      border: active ? 'none' : '1px solid #EBEBEB',
                      borderRadius: '12px',
                      padding: '12px 6px',
                      fontSize: '12.5px',
                      fontWeight: active ? '700' : '600',
                      cursor: 'pointer',
                    }}
                  >
                    {time}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Name & Phone Number */}
          <div>
            <label style={{ fontSize: '14px', fontWeight: 700 }}>Your name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              style={{ width: '100%', background: '#fff', border: '1px solid #EBEBEB', borderRadius: '12px', padding: '14px', marginTop: '10px', fontSize: '14px', fontWeight: 600, outline: 'none' }}
              className="focus:border-[#F0743E]"
            />

            <label style={{ fontSize: '14px', fontWeight: 700, display: 'block', marginTop: '16px' }}>Your phone number</label>
            <input
              type="tel"
              placeholder="+91 98260 XXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: '100%', background: '#fff', border: '1px solid #EBEBEB', borderRadius: '12px', padding: '14px', marginTop: '10px', fontSize: '14px', fontWeight: 600, outline: 'none' }}
              className="focus:border-[#F0743E]"
            />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', marginTop: '8px', background: '#F3ECF7', borderRadius: '10px', padding: '10px 12px' }}>
              <span style={{ fontSize: '13px' }}>🔒</span>
              <span style={{ fontSize: '11.5px', color: '#7A5CA0', fontWeight: 600, lineHeight: 1.4 }}>
                Only shared with the dealer you choose. Never shown publicly.
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{ width: '100%', height: '54px', background: '#F0743E', color: '#fff', border: 'none', borderRadius: '12px', fontFamily: 'inherit', fontSize: '16px', fontWeight: 700, boxShadow: '0 6px 16px rgba(240,116,62,.3)', cursor: 'pointer' }}
          >
            {submitting ? 'Sending Request...' : 'Notify Dealers'}
          </button>
          <p style={{ margin: 0, textAlign: 'center', fontSize: '12px', color: '#6B6B6B', fontWeight: 600 }}>
            Dealers will respond on this platform. No spam calls.
          </p>
        </form>
      </div>
    </div>
  );
}
