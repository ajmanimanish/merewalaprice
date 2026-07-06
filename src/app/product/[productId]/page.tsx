import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DealerList from './DealerList';
import ProductTracker from '@/components/ProductTracker';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';

interface PageProps {
  params: {
    productId: string;
  };
}

export const revalidate = 0; // Fresh prices always

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

const getSpecsList = (product: any) => {
  if (product.specs && Object.keys(product.specs).length > 0) {
    return Object.entries(product.specs).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`);
  }
  if (product.category === 'AC') {
    return ['1.5 Ton', '5 Star', 'Inverter', 'R32', 'Copper Coil', '10yr Compressor'];
  }
  if (product.category === 'FRIDGE') {
    return ['260 Litres', '2 Star', 'Double Door', 'Smart Inverter', 'Frost-Free'];
  }
  if (product.category === 'WM') {
    return ['8 Kg', '5 Star', 'Front Load', 'Inverter Motor', 'Smart Diagnosis'];
  }
  if (product.category === 'TV') {
    return ['43 inch', '4K Ultra HD', 'Smart TV', 'Google TV', 'Dolby Audio'];
  }
  return ['Official Model', 'Warranty Included'];
};

function getPlatformLabel(platform: string): string {
  const labels: Record<string, string> = {
    amazon: 'Amazon',
    flipkart: 'Flipkart',
    croma: 'Croma',
    reliance: 'Reliance Digital',
    lotus: 'Lotus Electronics',
  };
  return labels[platform] || platform;
}

function getPlatformUrl(platform: string, modelNumber: string, product?: any): string {
  const q = encodeURIComponent(modelNumber);
  // Priority 1: ASIN → direct Amazon product page
  if (platform === 'amazon' && product?.asin) {
    return `https://www.amazon.in/dp/${product.asin}`;
  }
  // Priority 2: stored product-level URLs from seed/import
  if (platform === 'amazon' && product?.amazon_url && !product.amazon_url.includes('/s?k=')) {
    return product.amazon_url;
  }
  if (platform === 'flipkart' && product?.flipkart_url && !product.flipkart_url.includes('/search?')) {
    return product.flipkart_url;
  }
  // Priority 3: search by exact model number on each platform
  const urls: Record<string, string> = {
    amazon:   `https://www.amazon.in/s?k=${q}`,
    flipkart: `https://www.flipkart.com/search?q=${q}`,
    croma:    `https://www.croma.com/searchB?q=${q}`,
    reliance: `https://www.reliancedigital.in/search?q=${q}`,
    lotus:    `https://www.lotuselect.com/search?q=${q}`,
  };
  return urls[platform] || `https://www.google.com/search?q=${q}+price+india`;
}

export default async function ProductPage({ params }: PageProps) {
  const { productId } = params;

  // 1. Fetch product
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (productError || !product) {
    notFound();
  }

  // 2. Fetch dealer prices
  const { data: dealerPrices } = await supabase
    .from('dealer_prices')
    .select(`
      price, stock_status, inclusions, updated_at,
      card_offer_bank, card_offer_text, card_offer_savings, emi_available,
      dealers(id, shop_name, owner_name, phone, whatsapp, area, city, is_approved)
    `)
    .eq('product_id', productId)
    .neq('stock_status', 'out_of_stock')
    .order('price', { ascending: true });

  const activeDealerPrices = (dealerPrices || []).filter(
    (dp: any) => dp.dealers && dp.dealers.is_approved
  );

  // 3. Fetch online prices
  const { data: onlinePrices } = await supabase
    .from('online_prices')
    .select('*')
    .eq('product_id', productId)
    .order('price', { ascending: true });

  const validOnlinePrices = onlinePrices || [];

  // Find lowest online price
  const lowestOnlinePrice = validOnlinePrices.length > 0
    ? Math.min(...validOnlinePrices.map((o: any) => o.price))
    : undefined;

  // Fetch real bank offers
  const { data: bankOffers } = await supabase
    .from('bank_offers')
    .select('*')
    .eq('is_active', true);

  const getCardOffer = (platform: string, price: number) => {
    if (!price || !bankOffers) return null;
    const platformOffers = bankOffers.filter(
      (o: any) => o.platform?.toLowerCase() === platform?.toLowerCase() && 
      o.offer_type !== 'emi' && 
      price >= o.min_order &&
      o.discount_percent
    );
    if (!platformOffers.length) return null;
    
    let best = null;
    let bestSaving = 0;
    for (const offer of platformOffers) {
      const raw = (price * offer.discount_percent) / 100;
      const saving = offer.max_discount ? Math.min(raw, offer.max_discount) : raw;
      if (saving > bestSaving) {
        bestSaving = saving;
        best = offer;
      }
    }
    if (!best) return null;
    return { bank: best.bank, saving: Math.round(bestSaving) };
  };

  const formattedOnline = ['amazon', 'flipkart', 'croma', 'reliance'].map((plat) => {
    const entry = validOnlinePrices.find((o) => o.platform.toLowerCase() === plat);
    const basePrice = entry?.price || null;
    const accentColor = 
      plat === 'amazon' ? '#FF9900' :
      plat === 'flipkart' ? '#2874F0' :
      plat === 'croma' ? '#12B3B3' : '#E4032E';

    // URL priority: scraped product page > ASIN/product URLs > model search
    const scrapedUrl = entry?.url;
    const isScrapedUrlGood = scrapedUrl && 
      !scrapedUrl.includes('/s?k=') &&   // not a search page
      !scrapedUrl.includes('/search?') && // not a search page
      scrapedUrl.length > 30;             // not a stub

    return {
      key: plat,
      platform: plat.charAt(0).toUpperCase() + plat.slice(1),
      price: basePrice,
      accentColor,
      url: isScrapedUrlGood ? scrapedUrl : getPlatformUrl(plat, product.model_number, product),
    };
  });

  const bestBhopalPrice = activeDealerPrices.length > 0 ? activeDealerPrices[0].price : null;
  const cheapestOnlinePrice = lowestOnlinePrice || null;
  
  // Calculate Amazon True Price (base price - best card discount)
  const amzBase = validOnlinePrices.find((o) => o.platform.toLowerCase() === 'amazon')?.price || null;
  const amzOffer = amzBase ? getCardOffer('amazon', amzBase) : null;
  const amzTruePrice = amzBase ? (amzBase - (amzOffer?.saving || 0)) : null;

  // Max value for bar scaling
  const maxVal = Math.max(bestBhopalPrice || 0, cheapestOnlinePrice || 0, amzTruePrice || 0, 1000);
  
  // Bhopal savings % vs cheapest online
  const pctCheaper = (cheapestOnlinePrice && bestBhopalPrice && cheapestOnlinePrice > bestBhopalPrice)
    ? Math.round(((cheapestOnlinePrice - bestBhopalPrice) / cheapestOnlinePrice) * 100)
    : 0;

  return (
    <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FDFCFA] md:shadow-2xl md:border-x md:border-[#EAE6DD] flex flex-col justify-between font-sans overflow-y-auto relative pb-[134px]">
      <ProductTracker 
        productId={productId} 
        productName={product.name} 
        modelNumber={product.model_number} 
      />

      <div className="flex flex-col">
        {/* Status Bar */}
        <StatusBar />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: '#fff' }}>
          <Link href={`/category/${product.category.toLowerCase()}`}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#F6F4EF', border: '1px solid #EAE6DD', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16151A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="20" y1="12" x2="4" y2="12"/><polyline points="10 6 4 12 10 18"/></svg>
            </div>
          </Link>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#F6F4EF', border: '1px solid #EAE6DD', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16151A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#F6F4EF', border: '1px solid #EAE6DD', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16151A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.35-9.5-8.5C1 9.5 2.5 6 6 6c2 0 3.5 1.2 4 2.3C10.5 7.2 12 6 14 6c3.5 0 5 3.5 3.5 6.5C19 16.65 12 21 12 21z"/></svg>
            </div>
          </div>
        </div>

        {/* Image */}
        <div style={{ height: '220px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} style={{ height: '80%', objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: '74px' }}>{getCatEmoji(product.category)}</span>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', padding: '2px 0 10px', background: '#fff' }}>
          <span style={{ width: '16px', height: '4px', borderRadius: '2px', background: '#E4632E' }}></span>
          <span style={{ width: '4px', height: '4px', borderRadius: '2px', background: '#DDD8CC' }}></span>
          <span style={{ width: '4px', height: '4px', borderRadius: '2px', background: '#DDD8CC' }}></span>
        </div>

        {/* Info */}
        <div style={{ padding: '2px 20px 16px', background: '#FDFCFA' }}>
          <span style={{ display: 'inline-flex', fontSize: '10px', fontWeight: 800, letterSpacing: '.05em', color: '#fff', background: '#E4632E', textTransform: 'uppercase', padding: '4px 9px', borderRadius: '6px' }}>
            {product.brand}
          </span>
          <h2 style={{ margin: '10px 0 0', fontSize: '21px', fontWeight: 800, lineHeight: 1.22, letterSpacing: '-.01em', color: '#16151A' }}>
            {product.name}
          </h2>
          <div style={{ fontSize: '12.5px', color: '#6B6963', marginTop: '4px', fontWeight: 600 }}>{product.model_number}</div>
          {product.brand_url && (
            <a href={product.brand_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontSize: '12px', color: '#E4632E', marginTop: '6px', fontWeight: 700 }}>
              View on {product.brand} website →
            </a>
          )}
          
          {/* Spec Chips Scroll */}
          <div className="scrollx" style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginTop: '12px' }}>
            {getSpecsList(product).map((spec) => (
              <span key={spec} style={{ flex: '0 0 auto', fontSize: '11px', fontWeight: 700, background: '#fff', border: '1px solid #EAE6DD', padding: '6px 11px', borderRadius: '8px', color: '#16151A' }}>
                {spec}
              </span>
            ))}
          </div>
        </div>

        {/* Comparison Bar Chart Panel */}
        {bestBhopalPrice && (
          <div style={{ padding: '2px 20px 18px', background: '#FDFCFA' }}>
            <div style={{ background: '#16151A', borderRadius: '18px', padding: '18px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#B9B6AC', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Bhopal price vs. online
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '8px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>₹{bestBhopalPrice.toLocaleString()}</span>
                {pctCheaper > 0 && (
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#4ADE80' }}>↓ {pctCheaper}% cheaper</span>
                )}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginTop: '16px' }}>
                {/* Bhopal Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: 700, color: '#D8D5CC', marginBottom: '4px' }}>
                    <span>Best Bhopal dealer</span>
                    <span>₹{bestBhopalPrice.toLocaleString()}</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '4px', background: '#2A2A2E', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.max(15, (bestBhopalPrice / maxVal) * 85)}%`, borderRadius: '4px', background: '#E4632E' }}></div>
                  </div>
                </div>

                {/* Online Cheapest Bar */}
                {cheapestOnlinePrice && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: 700, color: '#D8D5CC', marginBottom: '4px' }}>
                      <span>Cheapest online</span>
                      <span>₹{cheapestOnlinePrice.toLocaleString()}</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', background: '#2A2A2E', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max(15, (cheapestOnlinePrice / maxVal) * 85)}%`, borderRadius: '4px', background: '#5B5A57' }}></div>
                    </div>
                  </div>
                )}

                {/* Amazon True Price Bar */}
                {amzTruePrice && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', fontWeight: 700, color: '#D8D5CC', marginBottom: '4px' }}>
                      <span>Amazon (true price)</span>
                      <span>₹{amzTruePrice.toLocaleString()}</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', background: '#2A2A2E', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max(15, (amzTruePrice / maxVal) * 85)}%`, borderRadius: '4px', background: '#5B5A57' }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Best Price Bhopal header */}
        <div style={{ padding: '2px 20px 4px', background: '#FDFCFA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#16151A' }}>
            {activeDealerPrices.length} {activeDealerPrices.length === 1 ? 'dealer has' : 'dealers have'} this in stock
          </span>
        </div>

        {/* Dealer prices list component */}
        <div style={{ padding: '10px 20px 4px', background: '#FDFCFA' }}>
          <DealerList 
            dealerPrices={activeDealerPrices} 
            lowestOnlinePrice={lowestOnlinePrice} 
            productName={product.name}
          />
        </div>

        {/* Online prices header */}
        {formattedOnline.some(x => x.price) && (
          <>
            <div style={{ padding: '18px 20px 4px', background: '#FDFCFA', fontSize: '15px', fontWeight: 800, color: '#16151A' }}>
              Online prices
            </div>

            {/* Online prices comparison list (single-line rows) */}
            <div style={{ padding: '10px 20px 16px', background: '#FDFCFA', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {formattedOnline.map((item) => {
                if (!item.price) return null;
                const offer = getCardOffer(item.key, item.price);

                return (
                  <a
                    key={item.platform}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none', display: 'block' }}
                  >
                    <div style={{ background: '#fff', border: '1px solid #EAE6DD', borderRadius: '12px', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.accentColor, flexShrink: 0 }}></span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#16151A' }}>{item.platform}</div>
                        {offer && (
                          <div style={{ fontSize: '10.5px', color: '#1F8A5C', fontWeight: 700, marginTop: '1px' }}>
                            💳 {offer.bank} Card saves ₹{offer.saving.toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                      
                      {offer ? (
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11.5px', color: '#9A978E', textDecoration: 'line-through', marginRight: '6px' }}>
                            ₹{item.price.toLocaleString()}
                          </span>
                          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#16151A' }}>
                            ₹{(item.price - offer.saving).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#16151A' }}>
                          ₹{item.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </a>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Floating AI chat bubble */}
      <Link href="/search">
        <div style={{ position: 'fixed', right: 'calc(50% - 175px)', bottom: '120px', width: '52px', height: '52px', borderRadius: '50%', background: '#F1ECF7', border: '1px solid #EAE6DD', boxShadow: '0 8px 20px rgba(22,21,26,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', cursor: 'pointer', zIndex: 30 }} className="hover:scale-105 transition-transform">
          ✨
        </div>
      </Link>

      {/* Sticky Bottom Special Request */}
      <div style={{ position: 'fixed', bottom: '58px', left: 0, right: 0, zIndex: 40 }} className="flex justify-center">
        <div style={{ width: '100%', maxWidth: '390px', padding: '14px 20px 24px', background: '#16151A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', boxShadow: '0 -4px 20px rgba(0,0,0,.15)' }}>
          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#fff', lineHeight: 1.35 }}>
            Need a different size or colour?
          </span>
          <Link href={`/request/${productId}`}>
            <button style={{ flexShrink: 0, background: '#E4632E', color: '#fff', border: 'none', borderRadius: '11px', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: 700, padding: '11px 15px', cursor: 'pointer' }}>
              Post request
            </button>
          </Link>
        </div>
      </div>

      <BottomNav active="browse" />
    </div>
  );
}
