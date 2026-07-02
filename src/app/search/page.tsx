'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';

interface SearchResult {
  id: string;
  brand: string;
  model_number: string;
  name: string;
  category: string;
  lowest_price: number;
  image_url: string | null;
}

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

const getCatName = (cat: string) => {
  switch (cat?.toUpperCase()) {
    case 'AC': return 'Air Conditioners';
    case 'TV': return 'Televisions';
    case 'WM': return 'Washing Machines';
    case 'FRIDGE': return 'Refrigerators';
    case 'LAPTOP': return 'Laptops';
    default: return 'Appliances';
  }
};

const defaultRecentSearches = [
  'Blue Star 1.5 Ton inverter',
  'Samsung 55 inch 4K',
  'Voltas 123INV',
];

const popularSearches = [
  { text: '🔥 1.5 Ton AC', query: '1.5 Ton AC' },
  { text: '📺 55" 4K TV', query: '55' },
  { text: '🧊 Double door fridge', query: 'Double door' },
  { text: '🌀 Front load WM', query: 'Front load' },
  { text: '💻 Laptop', query: 'Laptop' },
  { text: '❄️ Window AC', query: 'Window' },
];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(defaultRecentSearches);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Save recent search
  const saveSearch = (q: string) => {
    if (!q.trim()) return;
    const cleanQ = q.trim();
    const updated = [cleanQ, ...recentSearches.filter((s) => s !== cleanQ)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recent_searches', JSON.stringify(updated));
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('recent_searches');
  };

  // Perform search
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      const q = query.trim();
      if (!q) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        // PostgREST .or() breaks with spaces in values — use separate queries merged client-side
        const pat = `%${q}%`;

        // Run 3 parallel queries: by brand, by name, by model_number
        const [byBrand, byName, byModel] = await Promise.all([
          supabase
            .from('products')
            .select(`id, brand, model_number, name, category, image_url, online_prices ( price )`)
            .eq('is_active', true)
            .ilike('brand', pat)
            .limit(20),
          supabase
            .from('products')
            .select(`id, brand, model_number, name, category, image_url, online_prices ( price )`)
            .eq('is_active', true)
            .ilike('name', pat)
            .limit(20),
          supabase
            .from('products')
            .select(`id, brand, model_number, name, category, image_url, online_prices ( price )`)
            .eq('is_active', true)
            .ilike('model_number', pat)
            .limit(20),
        ]);

        // Merge and deduplicate by id
        const allRows = [
          ...(byBrand.data || []),
          ...(byName.data || []),
          ...(byModel.data || []),
        ];
        const seen = new Set<string>();
        const deduped = allRows.filter(p => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });

        const mapped: SearchResult[] = deduped.map((p: any) => {
          const onlinePrices = p.online_prices || [];
          const lowest = onlinePrices.length > 0
            ? Math.min(...onlinePrices.map((o: any) => o.price).filter(Boolean))
            : 0;
          return {
            id: p.id,
            brand: p.brand,
            model_number: p.model_number,
            name: p.name || p.model_number,
            category: p.category,
            lowest_price: lowest,
            image_url: p.image_url || null,
          };
        });
        setResults(mapped);
      } catch (err) {
        console.error('Error searching:', err);
      } finally {
        setLoading(false);
      }

    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Group results by category
  const categories = ['AC', 'TV', 'FRIDGE', 'WM', 'LAPTOP'];
  const groupedResults = categories.reduce((acc, cat) => {
    acc[cat] = results.filter((r) => r.category === cat);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const getAlternativeSuggestion = (cat: string) => {
    switch (cat) {
      case 'AC': return 'Try searching "Voltas 1.5" or "Daikin 5 Star"';
      case 'TV': return 'Try searching "LG 55" or "Sony 4K"';
      case 'FRIDGE': return 'Try searching "Double Door" or "Samsung 253L"';
      case 'WM': return 'Try searching "Front load" or "Fully Automatic"';
      default: return 'Try checking models in the browse page';
    }
  };

  return (
    <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FAFAF8] md:shadow-2xl md:border-x md:border-[#EBEBEB] flex flex-col justify-between font-sans overflow-y-auto">
      <div className="flex flex-col">
        {/* Status Bar */}
        <StatusBar />

        {/* Search Bar Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 18px 12px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: query ? '1.5px solid #F0743E' : '1px solid #EBEBEB', borderRadius: '12px', padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <span style={{ fontSize: '15px' }}>🔍</span>
            <input
              type="text"
              placeholder="Search AC, TV, fridge…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', fontWeight: query ? '700' : '500', color: '#141414' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveSearch(query);
                }
              }}
            />
            {query && (
              <span
                onClick={() => setQuery('')}
                style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#EBEBEB', color: '#6B6B6B', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                ✕
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setQuery('');
              router.push('/');
            }}
            style={{ fontSize: '13px', fontWeight: 700, color: '#F0743E', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>

        {/* Conditional Search views */}
        {!query.trim() ? (
          /* INITIAL VIEW: Recent and Popular Searches */
          <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {recentSearches.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800 }}>Recent Searches</span>
                  <span onClick={handleClearRecent} style={{ fontSize: '12px', fontWeight: 700, color: '#6B6B6B', cursor: 'pointer' }}>
                    Clear
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {recentSearches.map((s, idx) => (
                    <div
                      key={s}
                      onClick={() => setQuery(s)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '11px 0',
                        borderBottom: idx === recentSearches.length - 1 ? 'none' : '1px solid #EBEBEB',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: '15px', color: '#6B6B6B' }}>🕔</span>
                      <span style={{ flex: 1, fontSize: '13.5px', fontWeight: 600 }}>{s}</span>
                      <span style={{ fontSize: '14px', color: '#9a9a9a' }}>↗</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px' }}>Popular Searches</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {popularSearches.map((pop) => (
                  <span
                    key={pop.text}
                    onClick={() => {
                      setQuery(pop.query);
                      saveSearch(pop.query);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #EBEBEB', fontSize: '12.5px', fontWeight: 700, padding: '9px 14px', borderRadius: '999px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', cursor: 'pointer' }}
                  >
                    {pop.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* RESULTS VIEW */
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loading ? (
              <div className="p-10 text-center text-[14px] text-[#6B6B6B] flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-[#F0743E] border-t-transparent rounded-full animate-spin"></div>
                Searching database...
              </div>
            ) : (
              <>
                <div style={{ fontSize: '12px', color: '#6B6B6B', fontWeight: 600, padding: '0 20px 8px' }}>
                  {results.length} results for “{query}”
                </div>
                <div style={{ padding: '6px 18px 24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
                  {categories.map((cat) => {
                    const catItems = groupedResults[cat] || [];
                    const emoji = getCatEmoji(cat);
                    const name = getCatName(cat);
                    const activeCount = catItems.length;

                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '0 2px' }}>
                          <span style={{ fontSize: '14px' }}>{emoji}</span>
                          <span style={{ fontSize: '13.5px', fontWeight: 800 }}>{name}</span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: activeCount > 0 ? '#fff' : '#6B6B6B',
                              background: activeCount > 0 ? '#F0743E' : '#F0F0EE',
                              padding: '2px 8px',
                              borderRadius: '999px',
                            }}
                          >
                            {activeCount}
                          </span>
                        </div>

                        {activeCount > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {catItems.map((item) => (
                              <div
                                key={item.id}
                                onClick={() => {
                                  saveSearch(query);
                                  router.push(`/product/${item.id}`);
                                }}
                                style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '12px', display: 'flex', gap: '12px', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)', cursor: 'pointer' }}
                              >
                                <div style={{
                                  width: '56px', height: '56px', borderRadius: '12px',
                                  background: '#F5F5F5', flexShrink: 0,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  overflow: 'hidden',
                                }}>
                                  {item.image_url ? (
                                    <img
                                      src={item.image_url}
                                      alt={`${item.brand} ${item.model_number}`}
                                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.innerHTML = 
                                          `<span style="font-size:26px">${emoji}</span>`;
                                      }}
                                    />
                                  ) : (
                                    <span style={{ fontSize: '26px' }}>{emoji}</span>
                                  )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '9px', fontWeight: 800, color: '#F0743E', textTransform: 'uppercase' }}>
                                    {item.brand}
                                  </div>
                                  <div style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.name}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#6B6B6B' }}>{item.model_number}</div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <div style={{ fontSize: '10px', color: '#6B6B6B' }}>From</div>
                                  <div style={{ fontSize: '15px', fontWeight: 800 }}>
                                    {item.lowest_price > 0 ? `₹ ${item.lowest_price.toLocaleString()}` : '—'}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ background: '#fff', border: '1px dashed #EBEBEB', borderRadius: '16px', padding: '22px 16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '26px', marginBottom: '6px' }}>🔍</div>
                            <div style={{ fontSize: '13px', fontWeight: 700 }}>No {cat} matches “{query}”</div>
                            <div style={{ fontSize: '11.5px', color: '#6B6B6B', fontWeight: 600, marginTop: '3px' }}>
                              {getAlternativeSuggestion(cat)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <BottomNav active="search" />
    </div>
  );
}
