'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';

interface ProductCard {
  id: string;
  brand: string;
  model_number: string;
  name: string;
  category: string;
  specs: any;
  lowest_price: number;
  online_price: number;
  online_platform: string;
  dealers_count: number;
  saving: number;
  image_url: string | null;
}

const cleanNames: Record<string, string> = {
  AC: 'Air Conditioners',
  TV: 'Smart TVs',
  WM: 'Washing Machines',
  FRIDGE: 'Refrigerators',
  LAPTOP: 'Laptops',
};

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

function getBestOffer(platform: string, price: number, bankOffers: any[]) {
  if (!price || !bankOffers.length) return null;
  const offers = bankOffers.filter(
    o => o.platform?.toLowerCase() === platform?.toLowerCase() && 
    o.offer_type !== 'emi' && 
    price >= o.min_order && 
    o.discount_percent
  );
  if (!offers.length) return null;
  let best = null, bestSave = 0;
  for (const o of offers) {
    const save = Math.min(
      (price * o.discount_percent) / 100,
      o.max_discount || Infinity
    );
    if (save > bestSave) { bestSave = save; best = o; }
  }
  if (!best || bestSave < 100) return null;
  return { bank: best.bank, save: Math.round(bestSave) };
}

interface CategoryClientProps {
  initialProducts: any[];
  bankOffers: any[];
  categoryCode: string;
}

export default function CategoryClient({ initialProducts, bankOffers, categoryCode }: CategoryClientProps) {
  const router = useRouter();
  const categoryName = cleanNames[categoryCode] || categoryCode;

  // Process initialProducts into ProductCard format synchronously
  const processedProducts: ProductCard[] = initialProducts.map((p: any) => {
    const onlinePrices = p.online_prices || [];
    const dealerPrices = (p.dealer_prices || []).filter(
      (dp: any) => dp.stock_status !== 'out_of_stock'
    );
    
    const lowestOnline = onlinePrices.length > 0
      ? Math.min(...onlinePrices.map((o: any) => o.price).filter(Boolean))
      : 0;

    const lowestDealer = dealerPrices.length > 0
      ? Math.min(...dealerPrices.map((d: any) => d.price).filter(Boolean))
      : 0;

    const lowestPrice = lowestDealer || lowestOnline || 0;
    const saving = lowestDealer && lowestOnline && lowestDealer < lowestOnline
      ? lowestOnline - lowestDealer
      : 0;

    const onlinePlatform = onlinePrices[0]?.platform || 'Online';
    const dealersCount = dealerPrices.length;

    return {
      id: p.id,
      brand: p.brand,
      model_number: p.model_number,
      name: p.name || p.model_number,
      category: p.category,
      specs: p.specs || {},
      lowest_price: lowestPrice,
      online_price: lowestOnline,
      online_platform: onlinePlatform,
      dealers_count: dealersCount,
      saving: saving,
      image_url: p.image_url || null,
    };
  });

  const [products] = useState<ProductCard[]>(processedProducts);
  const [filteredProducts, setFilteredProducts] = useState<ProductCard[]>(processedProducts);
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortOption, setSortOption] = useState('Best Savings');

  // Apply filters and sorting
  useEffect(() => {
    let result = [...products];

    if (activeFilter !== 'All') {
      const f = activeFilter.toLowerCase();
      result = result.filter(p => {
        const fullText = `${p.brand} ${p.name} ${p.model_number} ${JSON.stringify(p.specs)}`.toLowerCase();
        if (f.includes('★') || f.includes('star')) {
          const rating = f.replace(/[^35]/g, ''); // Extract '3' or '5'
          return fullText.includes(`${rating} star`) || fullText.includes(`${rating}★`) || fullText.includes(`${rating} Star`);
        }
        if (f.includes('ton')) {
          const tonVal = f.split(' ')[0]; // '1', '1.5', '2'
          return fullText.includes(`${tonVal}t`) || fullText.includes(`${tonVal} ton`) || fullText.includes(`${tonVal} Ton`);
        }
        if (f === 'inverter') {
          return fullText.includes('inverter');
        }
        if (f === 'under ₹35k') {
          return p.lowest_price > 0 && p.lowest_price < 35000;
        }
        return fullText.includes(f);
      });
    }

    // Sort
    if (sortOption === 'Best Savings') {
      result.sort((a, b) => b.saving - a.saving);
    } else if (sortOption === 'Low to High') {
      result.sort((a, b) => (a.lowest_price || Infinity) - (b.lowest_price || Infinity));
    } else if (sortOption === 'High to Low') {
      result.sort((a, b) => b.lowest_price - a.lowest_price);
    }

    setFilteredProducts(result);
  }, [products, activeFilter, sortOption]);

  const getFilterChips = () => {
    switch (categoryCode) {
      case 'AC':
        return ['All', '1 Ton', '1.5 Ton', '2 Ton', '3★', '5★', 'Inverter', 'Under ₹35K'];
      case 'TV':
        return ['All', '32 inch', '43 inch', '55 inch', '4K', 'QLED'];
      case 'FRIDGE':
        return ['All', 'Single Door', 'Double Door', 'French Door', 'Frost-Free'];
      case 'WM':
        return ['All', 'Front Load', 'Top Load', 'Semi-Automatic', '7 Kg', '8 Kg'];
      default:
        return ['All'];
    }
  };

  const getSpecsString = (p: ProductCard) => {
    if (p.category === 'AC') {
      const ton = p.model_number.includes('12') || p.name.includes('1 Ton') ? '1T' : p.model_number.includes('24') ? '2T' : '1.5T';
      const rating = p.name.includes('5 Star') || p.name.includes('5★') ? '5★' : '3★';
      return `${ton} · ${rating} · Inverter · R32`;
    }
    if (p.category === 'FRIDGE') {
      const door = p.name.includes('Single') ? 'Single Door' : 'Double Door';
      const cap = p.name.match(/\b\d{3}L\b/) ? p.name.match(/\b\d{3}L\b/)![0] : 'Frost-Free';
      return `${door} · ${cap} · Convertible`;
    }
    if (p.category === 'WM') {
      const load = p.name.includes('Front') ? 'Front Load' : p.name.includes('Top') ? 'Top Load' : 'Semi-Auto';
      const wt = p.name.match(/\b\d+(\.\d+)?\s*Kg\b/i) ? p.name.match(/\b\d+(\.\d+)?\s*Kg\b/i)![0] : '7 Kg';
      return `${load} · ${wt} · 5★ Rating`;
    }
    if (p.category === 'TV') {
      const size = p.name.match(/\b\d{2}\s*(inch|\")\b/i) ? p.name.match(/\b\d{2}\s*(inch|\")\b/i)![0] : '43 inch';
      const res = p.name.includes('4K') || p.name.includes('UHD') ? '4K UHD' : 'LED';
      return `${size} · ${res} · Smart TV`;
    }
    return 'Official Indian Model';
  };

  return (
    <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FAFAF8] md:shadow-2xl md:border-x md:border-[#EBEBEB] flex flex-col justify-between font-sans overflow-y-auto">
      <div className="flex flex-col">
        <StatusBar />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px 12px' }}>
          <button
            onClick={() => router.push('/')}
            style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#fff', border: '1px solid #EBEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', cursor: 'pointer' }}
          >
            ←
          </button>
          <span style={{ fontSize: '16px', fontWeight: 800 }}>
            {categoryName} <span style={{ color: '#6B6B6B', fontWeight: 700 }}>({filteredProducts.length})</span>
          </span>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#fff', border: '1px solid #EBEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', cursor: 'pointer' }}>⚙️</div>
        </div>

        {/* Filter Chips */}
        <div className="scrollx" style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '0 18px 4px' }}>
          {getFilterChips().map((chip) => {
            const active = chip === activeFilter;
            return (
              <span
                key={chip}
                onClick={() => setActiveFilter(chip)}
                style={{
                  flex: '0 0 auto',
                  background: active ? '#F0743E' : '#fff',
                  border: active ? 'none' : '1px solid #EBEBEB',
                  color: active ? '#fff' : '#141414',
                  fontSize: '12px',
                  fontWeight: active ? '700' : '600',
                  padding: '8px 14px',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {chip}
              </span>
            );
          })}
        </div>

        {/* Sort Banner */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700 }}>
            Sort:{' '}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              style={{ color: '#F0743E', background: 'transparent', border: 'none', fontWeight: 700, outline: 'none', cursor: 'pointer' }}
            >
              <option value="Best Savings">Best Savings</option>
              <option value="Low to High">Price: Low to High</option>
              <option value="High to Low">Price: High to Low</option>
            </select>
          </span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B6B6B' }}>
            {filteredProducts.length} results
          </span>
        </div>

        {/* List of Products */}
        <div style={{ padding: '8px 18px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredProducts.length === 0 ? (
            <div className="p-10 text-center text-[14px] text-[#6B6B6B]">
              No models matched your selection.
            </div>
          ) : (
            filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/product/${p.id}`)}
                style={{
                  background: '#fff',
                  border: '1px solid #EBEBEB',
                  borderRadius: '16px',
                  padding: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                  display: 'flex',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease',
                }}
                className="hover:scale-[1.01]"
              >
                <div style={{
                  width: '80px', height: '80px', borderRadius: '12px',
                  background: '#F5F5F5', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={`${p.brand} ${p.model_number}`}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.innerHTML = 
                          `<span style="font-size:28px">${getCatEmoji(p.category)}</span>`;
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '28px' }}>{getCatEmoji(p.category)}</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '.06em', color: '#F0743E', textTransform: 'uppercase' }}>
                    {p.brand}
                  </span>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px', lineHeight: '1.25', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B6B6B', marginTop: '1px' }}>{p.model_number}</div>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '7px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '9px', fontWeight: 600, color: '#6B6B6B', background: '#FAFAF8', border: '1px solid #EBEBEB', padding: '3px 7px', borderRadius: '6px' }}>
                      {getSpecsString(p)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '9px' }}>
                    <span style={{ fontSize: '20px', fontWeight: 800 }}>
                      {p.lowest_price > 0 
                        ? `From ₹${p.lowest_price.toLocaleString('en-IN')}`
                        : 'Price coming soon'}
                    </span>
                    {p.online_price > p.lowest_price && p.lowest_price > 0 && (
                      <span style={{ fontSize: '11px', color: '#6B6B6B', textDecoration: 'line-through' }}>
                        {p.online_platform} ₹{p.online_price.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '9px' }}>
                    {p.saving > 0 ? (
                      <span style={{ display: 'inline-flex', background: '#E7F6ED', color: '#16A34A', fontSize: '10px', fontWeight: 700, padding: '4px 9px', borderRadius: '999px' }}>
                        Save ₹{p.saving.toLocaleString('en-IN')} vs online
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', background: '#FAFAF8', border: '1px solid #EBEBEB', color: '#6B6B6B', fontSize: '10px', fontWeight: 700, padding: '4px 9px', borderRadius: '999px' }}>
                        Official Model
                      </span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B6B6B' }}>
                        {p.dealers_count} {p.dealers_count === 1 ? 'dealer' : 'dealers'}
                      </span>
                      <span style={{ fontSize: '15px' }}>🤍</span>
                    </div>
                  </div>

                  {/* Card discount hint */}
                  {p.online_price > 0 && (() => {
                    const offer = getBestOffer(p.online_platform, p.online_price, bankOffers);
                    return offer ? (
                      <div style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#16A34A',
                        marginTop: '6px',
                      }}>
                        💳 {offer.bank} card saves ₹{offer.save.toLocaleString('en-IN')} online
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <BottomNav active="browse" />
    </div>
  );
}
