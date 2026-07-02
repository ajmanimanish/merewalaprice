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
    .select('*, dealers(id, shop_name, owner_name, phone, whatsapp, area, city, is_approved)')
    .eq('product_id', productId)
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
    return {
      text: `${best.bank} saves ₹${Math.round(bestSaving).toLocaleString('en-IN')}`,
      truePrice: price - Math.round(bestSaving),
    };
  };

  const formattedOnline = ['amazon', 'flipkart', 'croma', 'reliance'].map((plat) => {
    const entry = validOnlinePrices.find((o) => o.platform.toLowerCase() === plat);
    const basePrice = entry?.price || null;
    const accentColor = 
      plat === 'amazon' ? '#FF9900' :
      plat === 'flipkart' ? '#2874F0' :
      plat === 'croma' ? '#12B3B3' : '#E4032E';

    return {
      platform: plat.charAt(0).toUpperCase() + plat.slice(1),
      price: basePrice,
      accentColor,
      offer: basePrice ? getCardOffer(plat, basePrice) : null,
    };
  });

  return (
    <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FAFAF8] md:shadow-2xl md:border-x md:border-[#EBEBEB] flex flex-col justify-between font-sans overflow-y-auto relative pb-[134px]">
      <ProductTracker 
        productId={productId} 
        productName={product.name} 
        modelNumber={product.model_number} 
      />

      <div className="flex flex-col">
        {/* Status Bar */}
        <StatusBar />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px 8px', background: '#fff' }}>
          <Link href={`/category/${product.category.toLowerCase()}`}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#FAFAF8', border: '1px solid #EBEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', cursor: 'pointer' }}>←</div>
          </Link>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#FAFAF8', border: '1px solid #EBEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', cursor: 'pointer' }}>↗</div>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#FAFAF8', border: '1px solid #EBEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', cursor: 'pointer' }}>🤍</div>
          </div>
        </div>

        {/* Image */}
        <div style={{ height: '240px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '90px', position: 'relative' }}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} style={{ height: '80%', objectFit: 'contain' }} />
          ) : (
            getCatEmoji(product.category)
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '18px 20px 14px', background: '#FAFAF8' }}>
          <span style={{ display: 'inline-flex', fontSize: '10px', fontWeight: 800, letterSpacing: '.06em', color: '#fff', background: '#F0743E', textTransform: 'uppercase', padding: '4px 9px', borderRadius: '6px' }}>
            {product.brand}
          </span>
          <h2 style={{ margin: '10px 0 0', fontSize: '22px', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-.01em' }}>
            {product.name}
          </h2>
          <div style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>{product.model_number}</div>
          {product.brand_url && (
            <a href={product.brand_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontSize: '12px', color: '#6B6B6B', marginTop: '6px', fontWeight: 600 }}>
              View on {product.brand} website →
            </a>
          )}
          
          {/* Spec Chips Scroll */}
          <div className="scrollx" style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginTop: '14px' }}>
            {getSpecsList(product).map((spec) => (
              <span key={spec} style={{ flex: '0 0 auto', fontSize: '11px', fontWeight: 600, background: '#fff', border: '1px solid #EBEBEB', padding: '6px 11px', borderRadius: '8px' }}>
                {spec}
              </span>
            ))}
          </div>
        </div>

        {/* Best Price Bhopal header */}
        <div style={{ padding: '6px 20px 4px', background: '#FAFAF8' }}>
          <div style={{ fontSize: '16px', fontWeight: 800 }}>📍 Best Price in Bhopal Today</div>
          <div style={{ fontSize: '12.5px', color: '#6B6B6B', fontWeight: 600, marginTop: '2px' }}>
            {activeDealerPrices.length} {activeDealerPrices.length === 1 ? 'dealer has' : 'dealers have'} this in stock
          </div>
        </div>

        {/* Dealer prices list component */}
        <div style={{ padding: '12px 20px 4px', background: '#FAFAF8' }}>
          <DealerList 
            dealerPrices={activeDealerPrices} 
            lowestOnlinePrice={lowestOnlinePrice} 
            productName={product.name}
          />
        </div>

        {/* Online prices header */}
        <div style={{ padding: '14px 20px 4px', background: '#FAFAF8' }}>
          <div style={{ fontSize: '16px', fontWeight: 800 }}>🌐 Online Prices</div>
        </div>

        {/* Online prices comparison grid */}
        <div style={{ padding: '12px 20px 14px', background: '#FAFAF8', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {formattedOnline.map((item) => (
            <div key={item.platform} style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '14px', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              <div style={{ height: '4px', width: '34px', borderRadius: '2px', background: item.accentColor }}></div>
              <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '8px' }}>{item.platform}</div>
              
              {item.price ? (
                <>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#6B6B6B', marginTop: '6px' }}>
                    ₹ {item.price.toLocaleString()}
                  </div>
                  {item.offer && (
                    <>
                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#16A34A', marginTop: '4px' }}>
                        {item.offer.text}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B6B6B', marginTop: '6px' }}>True price</div>
                      <div style={{ fontSize: '17px', fontWeight: 800 }}>
                        ₹ {item.offer.truePrice.toLocaleString()}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '14px', fontWeight: 600 }}>
                  Not found
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Floating AI chat bubble */}
      <Link href="/search">
        <div style={{ position: 'fixed', right: 'calc(50% - 175px)', bottom: '84px', width: '52px', height: '52px', borderRadius: '50%', background: '#CDBCDB', boxShadow: '0 8px 20px rgba(20,20,20,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', cursor: 'pointer', zIndex: 30 }} className="hover:scale-105 transition-transform">
          ✨
        </div>
      </Link>

      {/* Sticky Bottom Special Request */}
      <div style={{ position: 'fixed', bottom: '58px', left: 0, right: 0, zIndex: 40 }} className="flex justify-center">
        <div style={{ width: '100%', maxWidth: '390px', padding: '14px 20px 22px', background: '#141414', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', boxShadow: '0 -4px 20px rgba(0,0,0,.15)' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', lineHeight: 1.35 }}>
            Need 2 Ton or different colour?
          </span>
          <Link href={`/request/${productId}`}>
            <button style={{ flexShrink: 0, background: '#F0743E', color: '#fff', border: 'none', borderRadius: '10px', fontFamily: 'inherit', fontSize: '12.5px', fontWeight: 700, padding: '10px 14px', cursor: 'pointer' }}>
              Post Request →
            </button>
          </Link>
        </div>
      </div>

      <BottomNav active="browse" />
    </div>
  );
}
