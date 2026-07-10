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
  year: number;
  mrp?: number | null;
  is_new_launch: boolean;
  is_bestseller: boolean;
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
    
    const onlinePricesVal = onlinePrices.map((o: any) => o.price).filter(Boolean);
    const lowestOnline = onlinePricesVal.length > 0
      ? Math.min(...onlinePricesVal)
      : 0;

    const dealerPricesVal = dealerPrices.map((d: any) => d.price).filter(Boolean);
    const lowestDealer = dealerPricesVal.length > 0
      ? Math.min(...dealerPricesVal)
      : 0;

    const lowestPrice = lowestDealer || lowestOnline || 0;
    const saving = lowestDealer && lowestOnline && lowestDealer < lowestOnline
      ? lowestOnline - lowestDealer
      : 0;

    const onlinePlatform = onlinePrices[0]?.platform || 'Online';
    const dealersCount = dealerPrices.length;

    const modelYear = p.year || (() => {
      // Detect year from model name or specs
      const text = `${p.name} ${p.model_number} ${JSON.stringify(p.specs)}`;
      const m = text.match(/202[3-6]/);
      return m ? parseInt(m[0]) : 2024;
    })();

    const isNewLaunch = modelYear >= 2025;

    // Known bestsellers by model number
    const BESTSELLERS = [
      'IE518PNU', '185V Vectra CAR', '123INV', 'AS-Q19YNZE1', 'RS-Q18YNZE',
      'FTKR50TV', 'FTKC35TV', 'WW70FG4S02AXTL', 'RT28C3122S8', 'GL-S292RDSY',
      'UA43DUE70AKLXL', 'QA43Q60DAKLXL', '43UR7500PSC', 'KD-43X74L',
      'FHM1408BDL', 'T70SKSF4Z', 'HW80-BD12876NZP5', 'WAJ2006WIN'
    ];
    const isBestseller = BESTSELLERS.includes(p.model_number);

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
      year: modelYear,
      mrp: p.mrp,
      is_new_launch: isNewLaunch,
      is_bestseller: isBestseller,
    };
  });

  const [products] = useState<ProductCard[]>(processedProducts);
  const [filteredProducts, setFilteredProducts] = useState<ProductCard[]>(processedProducts);
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortOption, setSortOption] = useState('Best Seller');

  // Brand and Year Filter States
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);

  // Sync URL search params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const brandParam = params.get('brand');
    const yearParam = params.get('year');
    if (brandParam) {
      setSelectedBrands(brandParam.split(',').filter(Boolean));
    }
    if (yearParam) {
      setSelectedYears(yearParam.split(',').map(Number).filter(Boolean));
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedBrands.length > 0) {
      params.set('brand', selectedBrands.join(','));
    } else {
      params.delete('brand');
    }
    if (selectedYears.length > 0) {
      params.set('year', selectedYears.join(','));
    } else {
      params.delete('year');
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
  }, [selectedBrands, selectedYears]);

  // Helper matching function
  const matchesChipFilter = (p: ProductCard, chip: string): boolean => {
    if (chip === 'All') return true;
    const f = chip.toLowerCase();
    const fullText = `${p.brand} ${p.name} ${p.model_number} ${JSON.stringify(p.specs)}`.toLowerCase();
    if (f.includes('★') || f.includes('star')) {
      const rating = f.replace(/[^35]/g, '');
      return fullText.includes(`${rating} star`) || fullText.includes(`${rating}★`) || fullText.includes(`${rating} Star`);
    }
    if (f.includes('ton')) {
      const tonVal = f.split(' ')[0];
      return fullText.includes(`${tonVal}t`) || fullText.includes(`${tonVal} ton`) || fullText.includes(`${tonVal} Ton`);
    }
    if (f === 'inverter') {
      return fullText.includes('inverter');
    }
    if (f === 'under ₹35k') {
      return p.lowest_price > 0 && p.lowest_price < 35000;
    }
    return fullText.includes(f);
  };

  // Get distinct brands and distinct years
  const distinctBrands = Array.from(new Set(products.map(p => p.brand))).sort();
  const distinctYears = Array.from(new Set(products.map(p => p.year).filter(Boolean) as number[])).sort((a, b) => b - a);

  // Live Faceted Counts
  const getBrandCounts = () => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const matchesChip = matchesChipFilter(p, activeFilter);
      const matchesYear = selectedYears.length === 0 || selectedYears.includes(p.year || 0);
      if (matchesChip && matchesYear) {
        counts[p.brand] = (counts[p.brand] || 0) + 1;
      }
    });
    return counts;
  };

  const getYearCounts = () => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      const matchesChip = matchesChipFilter(p, activeFilter);
      const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(p.brand);
      if (matchesChip && matchesBrand) {
        const yr = p.year || 0;
        counts[yr] = (counts[yr] || 0) + 1;
      }
    });
    return counts;
  };

  const brandCounts = getBrandCounts();
  const yearCounts = getYearCounts();

  // Apply filters and sorting
  useEffect(() => {
    let result = [...products];

    // Chip Filter
    if (activeFilter !== 'All') {
      result = result.filter(p => matchesChipFilter(p, activeFilter));
    }

    // Brand Filter (AND)
    if (selectedBrands.length > 0) {
      result = result.filter(p => selectedBrands.includes(p.brand));
    }

    // Year Filter (AND)
    if (selectedYears.length > 0) {
      result = result.filter(p => selectedYears.includes(p.year || 0));
    }

    // Sort
    if (sortOption === 'Best Seller') {
      result.sort((a, b) => {
        // 1. Bestsellers first
        if (a.is_bestseller && !b.is_bestseller) return -1;
        if (!a.is_bestseller && b.is_bestseller) return 1;
        // 2. New launches second
        if (a.is_new_launch && !b.is_new_launch) return -1;
        if (!a.is_new_launch && b.is_new_launch) return 1;
        // 3. Has price vs no price
        if (a.lowest_price && !b.lowest_price) return -1;
        if (!a.lowest_price && b.lowest_price) return 1;
        // 4. By year descending
        if (a.year !== b.year) return b.year - a.year;
        // 5. By savings descending
        return b.saving - a.saving;
      });
    } else if (sortOption === 'New Launches First') {
      result.sort((a, b) => b.year - a.year || b.lowest_price - a.lowest_price);
    } else if (sortOption === 'Best Savings') {
      result.sort((a, b) => b.saving - a.saving);
    } else if (sortOption === 'Low to High') {
      result.sort((a, b) => (a.lowest_price || Infinity) - (b.lowest_price || Infinity));
    } else if (sortOption === 'High to Low') {
      result.sort((a, b) => b.lowest_price - a.lowest_price);
    }

    setFilteredProducts(result);
  }, [products, activeFilter, selectedBrands, selectedYears, sortOption]);

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
          <button
            onClick={() => setShowFiltersSheet(true)}
            style={{ width: '38px', height: '38px', borderRadius: '50%', background: selectedBrands.length > 0 || selectedYears.length > 0 ? '#FBEEE7' : '#fff', border: selectedBrands.length > 0 || selectedYears.length > 0 ? '1.5px solid #E4632E' : '1px solid #EBEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', cursor: 'pointer', outline: 'none' }}
          >
            ⚙️
          </button>
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

        {/* Results Counter & Sort Label */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#16151A' }}>Sort By</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B6B6B' }}>
            {filteredProducts.length} results
          </span>
        </div>

        {/* Sort chips — replaces dropdown */}
        <div className="scrollx" style={{ 
          display: 'flex', gap: '8px', overflowX: 'auto', 
          padding: '0 20px 12px', scrollbarWidth: 'none'
        }}>
          {['Best Seller', 'New Launches', 'Price ↑', 'Price ↓', 'Best Savings'].map(opt => {
            const isSelected = sortOption === opt || 
              (opt === 'Price ↑' && sortOption === 'Price: Low to High') ||
              (opt === 'Price ↓' && sortOption === 'Price: High to Low') ||
              (opt === 'New Launches' && sortOption === 'New Launches First');
            return (
              <button
                key={opt}
                onClick={() => setSortOption(
                  opt === 'Price ↑' ? 'Price: Low to High' :
                  opt === 'Price ↓' ? 'Price: High to Low' :
                  opt === 'New Launches' ? 'New Launches First' : opt
                )}
                style={{
                  flexShrink: 0,
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: '1px solid',
                  cursor: 'pointer',
                  background: isSelected ? '#F0743E' : '#fff',
                  color: isSelected ? '#fff' : '#141414',
                  borderColor: isSelected ? '#F0743E' : '#EBEBEB',
                  outline: 'none',
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Active Filters Display */}
        {(selectedBrands.length > 0 || selectedYears.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px 18px 4px', alignItems: 'center' }}>
            {selectedBrands.map(brand => (
              <span
                key={brand}
                onClick={() => setSelectedBrands(prev => prev.filter(b => b !== brand))}
                style={{ fontSize: '11px', fontWeight: 700, background: '#FBEEE7', color: '#E4632E', border: '1px solid #EAE6DD', padding: '4px 10px', borderRadius: '999px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                {brand} <span style={{ fontSize: '10px', fontWeight: 800 }}>✕</span>
              </span>
            ))}
            {selectedYears.map(yr => (
              <span
                key={yr}
                onClick={() => setSelectedYears(prev => prev.filter(y => y !== yr))}
                style={{ fontSize: '11px', fontWeight: 700, background: '#F1ECF7', color: '#6E5A99', border: '1px solid #EAE6DD', padding: '4px 10px', borderRadius: '999px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                {yr} <span style={{ fontSize: '10px', fontWeight: 800 }}>✕</span>
              </span>
            ))}
            <button
              onClick={() => {
                setSelectedBrands([]);
                setSelectedYears([]);
              }}
              style={{ fontSize: '11px', fontWeight: 700, background: 'none', border: 'none', color: '#6B6963', cursor: 'pointer', padding: '4px 8px', textDecoration: 'underline' }}
            >
              Clear all
            </button>
          </div>
        )}

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
                  {/* Brand pill */}
                  <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.08em', color: '#F0743E', textTransform: 'uppercase', marginBottom: '2px' }}>
                    {p.brand}
                  </div>

                  {/* Badges row — NEW */}
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    {p.is_bestseller && (
                      <div style={{ 
                        background: '#FDDB48', color: '#141414',
                        fontSize: '9px', fontWeight: 800, padding: '2px 6px',
                        borderRadius: '999px', letterSpacing: '0.04em'
                      }}>
                        🏆 BESTSELLER
                      </div>
                    )}
                    {p.is_new_launch && (
                      <div style={{ 
                        background: '#EEF2FF', color: '#4F46E5',
                        fontSize: '9px', fontWeight: 800, padding: '2px 6px',
                        borderRadius: '999px', letterSpacing: '0.04em'
                      }}>
                        ✨ NEW {p.year}
                      </div>
                    )}
                    {p.dealers_count > 0 && (
                      <div style={{ 
                        background: '#E7F6ED', color: '#16A34A',
                        fontSize: '9px', fontWeight: 800, padding: '2px 6px',
                        borderRadius: '999px'
                      }}>
                        📍 {p.dealers_count} local dealer{p.dealers_count > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
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
                    {p.lowest_price > 0 ? (
                      <>
                        <span style={{ fontSize: '20px', fontWeight: 800 }}>
                          From ₹{p.lowest_price.toLocaleString('en-IN')}
                        </span>
                        {p.online_price > p.lowest_price && (
                          <span style={{ fontSize: '11px', color: '#6B6B6B', textDecoration: 'line-through' }}>
                            {p.online_platform} ₹{p.online_price.toLocaleString('en-IN')}
                          </span>
                        )}
                      </>
                    ) : p.mrp ? (
                      <span style={{ fontSize: '15px', color: '#6B6963', fontWeight: 700 }}>
                        ₹{p.mrp.toLocaleString('en-IN')} (MRP)
                      </span>
                    ) : (
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#9A978E' }}>
                        Price coming soon
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

      {/* Slide-Up Filters Bottom Sheet */}
      {showFiltersSheet && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(22,21,26,.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowFiltersSheet(false)}
        >
          <div
            style={{ background: '#fff', width: '100%', borderRadius: '24px 24px 0 0', padding: '20px 22px 30px', maxWidth: '390px', boxShadow: '0 -8px 30px rgba(0,0,0,.15)', position: 'relative', display: 'flex', flexDirection: 'column', gap: '18px' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#16151A' }}>Filters</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {(selectedBrands.length > 0 || selectedYears.length > 0) && (
                  <button
                    onClick={() => {
                      setSelectedBrands([]);
                      setSelectedYears([]);
                    }}
                    style={{ background: 'none', border: 'none', color: '#E4632E', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Reset all
                  </button>
                )}
                <button
                  onClick={() => setShowFiltersSheet(false)}
                  style={{ border: 'none', background: 'transparent', fontSize: '16px', cursor: 'pointer', color: '#6B6963', fontWeight: 700 }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Brand Filter */}
            <div>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#16151A', display: 'block', marginBottom: '8px' }}>Brands</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '110px', overflowY: 'auto', paddingRight: '4px' }}>
                {distinctBrands.map(brand => {
                  const isChecked = selectedBrands.includes(brand);
                  const count = brandCounts[brand] || 0;
                  return (
                    <span
                      key={brand}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedBrands(prev => prev.filter(b => b !== brand));
                        } else {
                          setSelectedBrands(prev => [...prev, brand]);
                        }
                      }}
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        background: isChecked ? '#FBEEE7' : '#fff',
                        border: isChecked ? '1.5px solid #E4632E' : '1px solid #EAE6DD',
                        color: isChecked ? '#E4632E' : '#16151A',
                        padding: '6px 12px',
                        borderRadius: '999px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        opacity: count === 0 && !isChecked ? 0.45 : 1,
                        pointerEvents: count === 0 && !isChecked ? 'none' : 'auto',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {brand} <span style={{ fontSize: '10px', fontWeight: 600, color: isChecked ? '#E4632E' : '#6B6963' }}>({count})</span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Year Filter */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#16151A' }}>Launch Year</span>
                <button
                  onClick={() => {
                    setSelectedYears([2025, 2026]);
                  }}
                  style={{ background: 'none', border: 'none', color: '#6E5A99', fontSize: '11px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  2025 & 2026 only
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {distinctYears.map(yr => {
                  const isChecked = selectedYears.includes(yr);
                  const count = yearCounts[yr] || 0;
                  return (
                    <span
                      key={yr}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedYears(prev => prev.filter(y => y !== yr));
                        } else {
                          setSelectedYears(prev => [...prev, yr]);
                        }
                      }}
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        background: isChecked ? '#F1ECF7' : '#fff',
                        border: isChecked ? '1.5px solid #6E5A99' : '1px solid #EAE6DD',
                        color: isChecked ? '#6E5A99' : '#16151A',
                        padding: '6px 12px',
                        borderRadius: '999px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        opacity: count === 0 && !isChecked ? 0.45 : 1,
                        pointerEvents: count === 0 && !isChecked ? 'none' : 'auto',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {yr} <span style={{ fontSize: '10px', fontWeight: 600, color: isChecked ? '#6E5A99' : '#6B6963' }}>({count})</span>
                    </span>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setShowFiltersSheet(false)}
              style={{ width: '100%', height: '48px', background: '#16151A', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginTop: '6px' }}
            >
              Apply Filters ({filteredProducts.length} models)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
