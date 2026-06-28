'use client';

import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Globe, 
  MessageCircle, 
  RotateCw, 
  Tag, 
  HelpCircle, 
  Check, 
  ChevronRight, 
  Clock, 
  Sparkles,
  Lock,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Dealer {
  shop_name: string;
  owner_name: string;
  area: string;
  phone: string;
  whatsapp: string;
}

interface Offer {
  id: string;
  price: number;
  inclusions: string[];
  availability: string;
  alternative_model?: string;
  alternative_price?: number;
  alternative_note?: string;
  status: string;
  created_at: string;
  dealer: Dealer;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  model_number: string;
  image_url?: string;
  amazon_url?: string;
  flipkart_url?: string;
}

interface RequestDetails {
  id: string;
  product_id: string;
  buyer_phone: string;
  buyer_name: string;
  budget: number;
  area: string;
  urgency: string;
  purchase_type: string;
  quantity: number;
  status: string;
  expires_at: string;
  created_at: string;
}

interface OnlinePrice {
  id: string;
  platform: 'amazon' | 'flipkart' | 'croma';
  price: number | null;
  offer_details?: string;
  installation_cost: number;
  true_cost: number | null;
  url?: string;
  fetch_status?: string;
}

interface DashboardData {
  request: RequestDetails;
  product: Product;
  offers: Offer[];
  online_prices: OnlinePrice[];
}

interface ResultsDashboardProps {
  initialData: DashboardData;
  requestId: string;
  token: string;
}

export default function ResultsDashboard({ initialData, requestId, token }: ResultsDashboardProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [activeTab, setActiveTab] = useState<'dealers' | 'online'>('dealers');
  const [refreshing, setRefreshing] = useState(false);
  const [contactingId, setContactingId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());

  const { request, product, offers, online_prices } = data;

  // Real-time polling (every 5 minutes)
  useEffect(() => {
    const handlePoll = async () => {
      try {
        const { data: polled, error } = await supabase.rpc('get_request_details', {
          req_id: requestId,
          token: token
        });
        if (!error && polled) {
          setData(polled);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    if (request.status === 'open') {
      const timer = setInterval(handlePoll, 5 * 60 * 1000);
      return () => clearInterval(timer);
    }
  }, [requestId, token, request.status]);

  // Expiration countdown timer and current time tracking for threshold
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      setCurrentTime(now);
      const diff = new Date(request.expires_at).getTime() - now;
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      
      const minStr = mins > 0 ? `${mins}m ` : '';
      setTimeLeft(`${minStr}${secs}s`);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [request.expires_at]);

  // Manual refresh handler
  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const { data: refreshed, error } = await supabase.rpc('get_request_details', {
        req_id: requestId,
        token: token
      });
      if (error) throw error;
      if (refreshed) {
        setData(refreshed);
      }
    } catch (err) {
      console.error('Manual refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Click WhatsApp contact handler
  const handleContactDealer = async (offerId: string, isAlternative: boolean = false) => {
    setContactingId(offerId + (isAlternative ? '-alt' : ''));
    try {
      const response = await fetch('/api/requests/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          offerId,
          token,
        })
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error);
      
      // Open WhatsApp chat in a new tab
      if (resData.waUrl) {
        window.open(resData.waUrl, '_blank');
      }
      
      // Update status locally
      handleManualRefresh();
    } catch (err) {
      alert('Dealer connect karne me problem aayi. Please retry.');
      console.error('Contact dealer err:', err);
    } finally {
      setContactingId(null);
    }
  };

  // Availability label formatter
  const getAvailabilityLabel = (val: string) => {
    switch (val) {
      case 'today': return 'Aaj hi ready! ⚡';
      case '1-2days': return '1-2 Din me delivery';
      case '4-5days': return '4-5 Din me delivery';
      default: return val;
    }
  };

  // Helper function to calculate an offer's true cost (price + installation if not included)
  const getOfferTrueValue = (oPrice: number, oInclusions: string[]) => {
    const hasFreeInstallation = oInclusions.some(inc => 
      inc.toLowerCase().includes('installation') || inc.toLowerCase().includes('install')
    );
    if ((product.category === 'AC' || product.category === 'WM') && !hasFreeInstallation) {
      return oPrice + 1200; // installation cost of ₹1200 added if not included free
    }
    return oPrice;
  };

  // Threshold Check: Show offers if at least 3 offers OR 2 hours passed since creation OR request already fulfilled/expired
  const createdTime = new Date(request.created_at).getTime();
  const twoHoursInMs = 2 * 60 * 60 * 1000;
  const timeThresholdPassed = currentTime - createdTime >= twoHoursInMs;
  const showOffers = offers.length >= 3 || timeThresholdPassed || request.status !== 'open';
  
  const timeRemainingMinutes = Math.max(0, Math.ceil((createdTime + twoHoursInMs - currentTime) / 60000));

  // Find lowest price overall to calculate savings (only compare true costs)
  const lowestDealerPrice = offers.reduce((min, o) => {
    const mainTrueCost = getOfferTrueValue(o.price, o.inclusions || []);
    let currMin = mainTrueCost < min ? mainTrueCost : min;
    if (o.alternative_price) {
      const altTrueCost = getOfferTrueValue(o.alternative_price, o.inclusions || []);
      if (altTrueCost < currMin) {
        currMin = altTrueCost;
      }
    }
    return currMin;
  }, Infinity);

  const lowestOnlinePrice = online_prices.reduce((min, op) => {
    if (op.fetch_status === 'failed' || op.true_cost === null || op.true_cost === undefined) {
      return min;
    }
    return op.true_cost < min ? op.true_cost : min;
  }, Infinity);
  
  const estimatedSavings = (lowestOnlinePrice !== Infinity && lowestDealerPrice !== Infinity && showOffers) 
    ? (lowestOnlinePrice - lowestDealerPrice) 
    : 0;

  return (
    <div className="flex flex-col min-h-screen pb-16 bg-slate-50/50">
      {/* Header Info */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-5 py-4 flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 leading-tight">
              Best Deal Results
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Request ID: <span className="font-mono text-[10px] text-slate-700">{requestId.slice(0, 8)}...</span>
            </p>
          </div>
          <button 
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-input transition-colors disabled:opacity-50"
            title="Refresh Deals"
          >
            <RotateCw className={`w-4 h-4 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Selected Product Card Summary */}
        <div className="bg-slate-50 rounded-card p-3 border border-slate-200/50 flex gap-3 items-center mt-3">
          <div className="w-12 h-12 rounded bg-white overflow-hidden border border-slate-200 flex-shrink-0 flex items-center justify-center">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <HelpCircle className="w-6 h-6 text-slate-300" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-black text-slate-900 truncate uppercase leading-none mb-1">
              {product.brand} {product.name}
            </h2>
            <p className="text-[10px] text-slate-500 font-bold truncate">
              Model: {product.model_number}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            {request.status === 'open' ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-orange-600 bg-orange-100/70 border border-orange-200 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3 animate-pulse" />
                {timeLeft}
              </span>
            ) : (
              <span className="inline-block text-[9px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full uppercase">
                {request.status}
              </span>
            )}
          </div>
        </div>

        {/* Savings banner */}
        {estimatedSavings > 0 && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-card p-2.5 mt-2 flex items-center gap-2 text-emerald-800 text-xs font-extrabold shadow-sm animate-pulse">
            <Sparkles className="w-4 h-4 text-emerald-600 fill-emerald-600 flex-shrink-0" />
            <span>
              Wow! Local deals me online se ₹{estimatedSavings.toLocaleString('en-IN')} bache hain! 🎉
            </span>
          </div>
        )}
      </header>

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200 bg-white">
        <button
          onClick={() => setActiveTab('dealers')}
          className={`flex-1 py-3 text-center text-sm font-extrabold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'dealers'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Store className="w-4 h-4" />
          Local Dealers ({offers.length})
        </button>
        <button
          onClick={() => setActiveTab('online')}
          className={`flex-1 py-3 text-center text-sm font-extrabold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'online'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Globe className="w-4 h-4" />
          Online Prices ({online_prices.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-5 flex-1">
        {activeTab === 'dealers' ? (
          <div className="space-y-4">
            {offers.length === 0 ? (
              // Empty State
              <div className="text-center py-16 px-4 bg-white border border-slate-100 rounded-card shadow-sm flex flex-col items-center">
                <div className="w-14 h-14 bg-orange-50 border border-orange-100 rounded-full flex items-center justify-center text-primary mb-4 animate-bounce">
                  <Store className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Dealers को Broadcast bhej diya hai!</h3>
                <p className="text-xs text-slate-500 font-medium max-w-xs mt-2 leading-relaxed">
                  Bhopal ke local shopkeepers check karke offers bhej rahe hain. WhatsApp results link auto update hoga. 
                </p>
                <div className="mt-6 flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                  <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping"></span>
                  Waiting for offers...
                </div>
              </div>
            ) : !showOffers ? (
              // Threshold Hiding Page (Fix 2)
              <div className="text-center py-12 px-4 bg-white border border-slate-100 rounded-card shadow-sm flex flex-col items-center">
                <div className="w-14 h-14 bg-orange-50 border border-orange-100 rounded-full flex items-center justify-center text-primary mb-4 animate-pulse">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Dealers best price dhundh rahe hain...</h3>
                
                {/* Offer count */}
                <p className="text-sm font-bold text-slate-700 mt-2">
                  {offers.length} {offers.length === 1 ? 'dealer' : 'dealers'} ne offer diya hai.
                </p>

                {/* Progress bar */}
                <div className="w-full max-w-[250px] bg-slate-100 h-2.5 rounded-full mt-4 overflow-hidden border border-slate-200">
                  <div 
                    className="bg-primary h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (offers.length / 3) * 100)}%` }}
                  ></div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase tracking-wide">
                  {offers.length}/3 Offers Received
                </span>

                {/* Estimated time remaining message */}
                <p className="text-xs text-slate-500 font-semibold max-w-xs mt-6 leading-relaxed bg-slate-50 p-3 rounded-card border border-slate-100">
                  Results <span className="text-primary font-black">{timeRemainingMinutes} minutes</span> mein ya 3 offers aane par dikhenge.
                </p>

                {/* Status indicator */}
                <div className="mt-6 flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                  <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping"></span>
                  Waiting for threshold...
                </div>
              </div>
            ) : (
              // Map offers ranked by true cost (price + installation if not included)
              (() => {
                const sortedOffers = [...offers].sort((a, b) => {
                  const valA = getOfferTrueValue(a.price, a.inclusions || []);
                  const valB = getOfferTrueValue(b.price, b.inclusions || []);
                  return valA - valB;
                });

                return sortedOffers.map((offer, idx) => {
                  const isBestDeal = idx === 0;
                  const inclusions = offer.inclusions || [];
                  const trueValue = getOfferTrueValue(offer.price, inclusions);

                  return (
                    <div key={offer.id} className="space-y-3">
                      {/* Main Offer Card */}
                      <div 
                        className={`card-premium relative overflow-hidden ${
                          isBestDeal 
                            ? 'border-primary/40 bg-gradient-to-b from-orange-50/20 to-white ring-2 ring-primary/10' 
                            : 'border-slate-100'
                        }`}
                      >
                        {isBestDeal && (
                          <div className="absolute top-0 right-0 bg-primary text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-lg flex items-center gap-1 shadow-sm">
                            <Tag className="w-3 h-3 fill-white" />
                            Best Deal
                          </div>
                        )}

                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                              {offer.dealer.shop_name}
                            </span>
                            <h4 className="text-2xl font-black text-slate-900 mt-1 leading-none">
                              ₹{offer.price.toLocaleString('en-IN')}
                            </h4>
                            
                            <span className="inline-block text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-2">
                              📍 {offer.dealer.area}
                            </span>
                            
                            {/* Display Computed True Value */}
                            <div className="text-[10px] font-semibold text-slate-500 mt-2">
                              True Value (Cost): <span className="font-extrabold text-slate-800">₹{trueValue.toLocaleString('en-IN')}</span> 
                              {trueValue > offer.price && ' (+ ₹1,200 Installation)'}
                            </div>
                          </div>
                          
                          <div className="text-right mt-1">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                              offer.availability === 'today' 
                                ? 'text-emerald-700 bg-emerald-100/70 border border-emerald-200'
                                : 'text-slate-600 bg-slate-100'
                            }`}>
                              {getAvailabilityLabel(offer.availability)}
                            </span>
                          </div>
                        </div>

                        {/* Inclusions */}
                        {inclusions.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-slate-100">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                              Inclusions (Free Extras)
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {inclusions.map((inc) => (
                                <span 
                                  key={inc}
                                  className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3 stroke-[3px]" />
                                  {inc}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Contact CTA */}
                        <div className="mt-5 flex gap-2">
                          <button
                            onClick={() => handleContactDealer(offer.id)}
                            disabled={contactingId !== null}
                            className="flex-1 btn-primary py-2.5 text-xs flex items-center justify-center gap-2 font-extrabold"
                          >
                            {contactingId === offer.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <MessageCircle className="w-4 h-4 fill-white text-primary" />
                            )}
                            Contact via WhatsApp
                          </button>
                        </div>
                      </div>

                      {/* Alternative Model Offer (If provided by dealer) */}
                      {offer.alternative_model && offer.alternative_price && (
                        <div className="card-premium border-amber-300 bg-amber-50/30 relative overflow-hidden ring-1 ring-amber-200 pl-5">
                          {/* Orange highlight side border */}
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
                          
                          <div className="absolute top-0 right-0 bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-bl">
                            Alternative Option
                          </div>

                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">
                                {offer.dealer.shop_name} ka dusra offer:
                              </span>
                              <h5 className="text-sm font-extrabold text-slate-900 mt-1">
                                {offer.alternative_model}
                              </h5>
                              <h4 className="text-xl font-black text-amber-700 mt-1 leading-none">
                                ₹{offer.alternative_price.toLocaleString('en-IN')}
                              </h4>
                              
                              <div className="text-[9px] font-semibold text-slate-500 mt-1">
                                True Value (Cost): <span className="font-bold text-slate-700">
                                  ₹{getOfferTrueValue(offer.alternative_price, inclusions).toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {offer.alternative_note && (
                            <p className="text-xs text-slate-600 bg-white border border-amber-100 rounded-md p-2 mt-3 font-medium italic">
                              💬 &ldquo;{offer.alternative_note}&rdquo;
                            </p>
                          )}

                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() => handleContactDealer(offer.id, true)}
                              disabled={contactingId !== null}
                              className="flex-1 bg-amber-600 text-white font-extrabold text-xs py-2 rounded-input flex items-center justify-center gap-1.5 hover:bg-amber-700 active:scale-[0.98] transition-all"
                            >
                              {contactingId === (offer.id + '-alt') ? (
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <MessageCircle className="w-3.5 h-3.5 fill-white text-amber-600" />
                              )}
                              Accept Alt Offer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()
            )}
          </div>
        ) : (
          // Online Prices Tab (Fix 1)
          <div className="space-y-4">
            {online_prices.length === 0 ? (
              <div className="text-center py-16 bg-white border border-slate-100 rounded-card shadow-sm flex flex-col items-center">
                <div className="w-14 h-14 bg-slate-50 border border-slate-200/50 rounded-full flex items-center justify-center text-slate-400 mb-4 animate-pulse">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">Online Prices fetching...</h3>
                <p className="text-xs text-slate-500 font-medium max-w-xs mt-2">
                  Amazon & Flipkart scraper is fetching latest online prices. Reload in a few seconds!
                </p>
              </div>
            ) : (
              online_prices.map((online) => {
                const isFailed = online.fetch_status === 'failed';

                if (isFailed) {
                  return (
                    <div key={online.id} className="card-premium border-red-100 bg-red-50/10">
                      <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider text-white ${
                        online.platform === 'amazon' ? 'bg-orange-500' :
                        online.platform === 'flipkart' ? 'bg-blue-600' : 'bg-red-600'
                      }`}>
                        {online.platform}
                      </span>
                      
                      <p className="text-xs font-bold text-red-700 mt-3 leading-relaxed">
                        Online price abhi fetch nahi ho saka. {online.platform === 'amazon' ? 'Amazon' : 'Flipkart'} directly check karein.
                      </p>
                      
                      <button
                        onClick={() => {
                          const searchUrl = online.platform === 'amazon' 
                            ? `https://www.amazon.in/s?k=${encodeURIComponent(product.model_number)}`
                            : `https://www.flipkart.com/search?q=${encodeURIComponent(product.model_number)}`;
                          window.open(searchUrl, '_blank');
                        }}
                        className="w-full btn-secondary text-xs font-bold py-2 mt-4 flex items-center justify-center gap-1.5"
                      >
                        Check on {online.platform === 'amazon' ? 'Amazon' : 'Flipkart'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={online.id} className="card-premium">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider text-white ${
                          online.platform === 'amazon' ? 'bg-orange-500' :
                          online.platform === 'flipkart' ? 'bg-blue-600' : 'bg-red-600'
                        }`}>
                          {online.platform}
                        </span>
                        
                        {/* Price Details */}
                        <div className="mt-3 flex flex-col gap-1">
                          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between gap-12">
                            <span>Product price:</span>
                            <span className="font-bold text-slate-700">₹{online.price ? online.price.toLocaleString('en-IN') : 'N/A'}</span>
                          </div>
                          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
                            <span>Installation:</span>
                            <span className="font-bold text-slate-700">₹{online.installation_cost.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="h-px bg-slate-100 my-1"></div>
                          <div className="text-sm font-extrabold text-slate-900 flex items-center justify-between">
                            <span>True Cost:</span>
                            <span className="text-base font-black text-slate-950">₹{online.true_cost ? online.true_cost.toLocaleString('en-IN') : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {online.url && (
                      <button
                        onClick={() => window.open(online.url, '_blank')}
                        className="w-full btn-secondary py-2.5 text-xs font-extrabold mt-4 flex items-center justify-center gap-1.5"
                      >
                        Buy on {online.platform}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
