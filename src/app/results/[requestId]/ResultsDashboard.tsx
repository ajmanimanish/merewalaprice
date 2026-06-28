'use client';

import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Globe, 
  MessageCircle, 
  RotateCw, 
  HelpCircle, 
  ChevronRight, 
  Clock, 
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
      alert('Could not connect to dealer. Please try again.');
      console.error('Contact dealer err:', err);
    } finally {
      setContactingId(null);
    }
  };

  // Availability label formatter
  const getAvailabilityLabel = (val: string) => {
    switch (val) {
      case 'today': return 'In Stock Today';
      case '1-2days': return 'Delivery in 1-2 Days';
      case '4-5days': return 'Delivery in 4-5 Days';
      default: return val;
    }
  };

  // Helper function to calculate an offer's true cost (price + installation if not included)
  const getOfferTrueValue = (oPrice: number, oInclusions: string[]) => {
    const hasFreeInstallation = oInclusions.some(inc => 
      inc.toLowerCase().includes('installation') || inc.toLowerCase().includes('install')
    );
    if ((product.category === 'AC' || product.category === 'WM') && !hasFreeInstallation) {
      return oPrice + 1200;
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
    <div className="flex flex-col min-h-screen pb-16 bg-[#FAFAF8] font-sans">
      {/* Header Info */}
      <header className="sticky top-0 z-30 bg-white border-b-[0.5px] border-[#EBEBEB] px-5 py-4 flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-[#141414] leading-tight tracking-tight">
              Best Deal Results
            </h1>
            <p className="text-[12px] text-[#6B6B6B] font-medium mt-0.5">
              Request ID: <span className="font-mono text-[11px] text-[#141414]">{requestId.slice(0, 8)}...</span>
            </p>
          </div>
          <button 
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="p-2 border-[0.5px] border-[#EBEBEB] hover:bg-[#FAFAF8] rounded-[10px] transition-colors disabled:opacity-50"
            title="Refresh Deals"
          >
            <RotateCw className={`w-4 h-4 text-[#6B6B6B] ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Selected Product Card Summary */}
        <div className="bg-white rounded-[16px] p-4 border-[0.5px] border-[#EBEBEB] flex gap-4 items-center mt-4">
          <div className="w-12 h-12 rounded-[8px] bg-[#FAFAF8] overflow-hidden border-[0.5px] border-[#EBEBEB] flex-shrink-0 flex items-center justify-center">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <HelpCircle className="w-6 h-6 text-slate-300" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[12px] font-bold text-[#141414] truncate uppercase leading-none mb-1">
              {product.brand} {product.name}
            </h2>
            <p className="text-[11px] text-[#6B6B6B] font-semibold truncate">
              Model: {product.model_number}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            {request.status === 'open' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F0743E] bg-[#FEF0E8] border-[0.5px] border-[#F6C3AE] px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" />
                {timeLeft}
              </span>
            ) : (
              <span className="inline-block text-[11px] font-bold text-[#6B6B6B] bg-[#EBEBEB] px-2 py-0.5 rounded-full uppercase">
                {request.status}
              </span>
            )}
          </div>
        </div>

        {/* Savings Banner */}
        {estimatedSavings > 0 && (
          <div className="bg-[#FEF0E8] border-[0.5px] border-[#F6C3AE] rounded-[12px] p-3 mt-3 text-[#16A34A] text-[13px] font-bold">
            Estimated savings of ₹{estimatedSavings.toLocaleString('en-IN')} compared to online!
          </div>
        )}
      </header>

      {/* Tab Selectors */}
      <div className="flex border-b border-[#EBEBEB] bg-white flex-shrink-0">
        <button
          onClick={() => setActiveTab('dealers')}
          className={`flex-1 py-3.5 text-center text-[14px] font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'dealers'
              ? 'border-[#F0743E] text-[#F0743E]'
              : 'border-transparent text-[#6B6B6B] hover:text-[#141414]'
          }`}
        >
          <Store className="w-4 h-4" />
          Local Dealers ({offers.length})
        </button>
        <button
          onClick={() => setActiveTab('online')}
          className={`flex-1 py-3.5 text-center text-[14px] font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'online'
              ? 'border-[#F0743E] text-[#F0743E]'
              : 'border-transparent text-[#6B6B6B] hover:text-[#141414]'
          }`}
        >
          <Globe className="w-4 h-4" />
          Online Platforms ({online_prices.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-5 flex-1">
        {activeTab === 'dealers' ? (
          <div className="space-y-4">
            {offers.length === 0 ? (
              // Empty State (Task 10 geometric shape)
              <div className="text-center py-16 px-4 bg-white border-[0.5px] border-[#EBEBEB] rounded-[16px] flex flex-col items-center">
                <div className="w-12 h-12 bg-[#FEF0E8] border-[0.5px] border-[#F6C3AE] rounded-full flex items-center justify-center text-[#F0743E] mb-4">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="text-[16px] font-bold text-[#141414]">Request broadcasted to local dealers</h3>
                <p className="text-[12px] text-[#6B6B6B] font-medium max-w-xs mt-2 leading-relaxed">
                  Bhopal shop owners are checking inventory to provide quotes. This page will update automatically.
                </p>
                <button
                  onClick={handleManualRefresh}
                  className="btn-secondary h-[44px] text-[13px] px-5 mt-6 font-bold"
                >
                  Check Updates
                </button>
              </div>
            ) : !showOffers ? (
              // Waiting State (Task 9 overlapping circles + progress bar)
              <div className="text-center py-16 px-5 bg-white border-[0.5px] border-[#EBEBEB] rounded-[16px] flex flex-col items-center">
                {/* 3 overlapping circles */}
                <div className="flex items-center justify-center relative w-24 h-12 mb-6">
                  <div className="w-10 h-10 rounded-full bg-[#CDBCDB]/60 absolute left-4"></div>
                  <div className="w-10 h-10 rounded-full bg-[#FDDB48]/60 absolute"></div>
                  <div className="w-10 h-10 rounded-full bg-[#F6C3AE]/60 absolute right-4"></div>
                </div>

                <h3 className="text-[18px] font-bold text-[#141414]">Getting quotes from local dealers</h3>
                
                {/* Offer count */}
                <p className="text-[14px] font-bold text-[#6B6B6B] mt-2">
                  {offers.length} of 3 responses received
                </p>

                {/* Thin progress bar */}
                <div className="w-full max-w-[240px] bg-[#EBEBEB] h-[3px] rounded-full overflow-hidden mt-4">
                  <div 
                    className="bg-[#F0743E] h-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (offers.length / 3) * 100)}%` }}
                  ></div>
                </div>

                {/* Threshold unlock warning */}
                <p className="text-[12px] text-[#A0A0A0] font-medium max-w-[280px] mt-6 leading-relaxed">
                  Results unlock in <span className="text-[#F0743E] font-bold">{timeRemainingMinutes} minutes</span> or when 3 dealers respond.
                </p>
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
                            ? 'border-l-4 border-l-[#F0743E] bg-[#FEF0E8]/30' 
                            : ''
                        }`}
                      >
                        {isBestDeal && (
                          <div className="absolute top-4 right-4 bg-[#FDDB48] text-[#141414] text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[6px]">
                            Best Deal
                          </div>
                        )}

                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[12px] font-bold text-[#A0A0A0] uppercase tracking-wider">
                              {offer.dealer.shop_name}
                            </span>
                            {/* Price display size 28-32px Tabular nums */}
                            <h4 className="text-[32px] font-bold text-[#141414] mt-2 leading-none font-mono">
                              ₹{offer.price.toLocaleString('en-IN')}
                            </h4>
                            
                            <span className="inline-block text-[11px] font-bold text-[#6B6B6B] bg-[#FAFAF8] border-[0.5px] border-[#EBEBEB] px-2 py-0.5 rounded-full mt-3">
                              {offer.dealer.area}
                            </span>
                            
                            {/* Display Computed True Value */}
                            <div className="text-[12px] font-semibold text-[#6B6B6B] mt-3">
                              True Cost: <span className="font-bold text-[#141414]">₹{trueValue.toLocaleString('en-IN')}</span> 
                              {trueValue > offer.price && ' (+ ₹1,200 installation)'}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-[6px] text-[#6B6B6B] bg-[#FAFAF8] border-[0.5px] border-[#EBEBEB]">
                              {getAvailabilityLabel(offer.availability)}
                            </span>
                          </div>
                        </div>

                        {/* Inclusions */}
                        {inclusions.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-[#EBEBEB]">
                            <span className="text-[11px] font-bold text-[#A0A0A0] uppercase tracking-wider block mb-2">
                              Included in price
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {inclusions.map((inc) => (
                                <span 
                                  key={inc}
                                  className="text-[11px] font-bold text-[#16A34A] bg-green-50 border-[0.5px] border-green-200 px-2.5 py-0.5 rounded-[6px]"
                                >
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
                            className="flex-1 btn-primary text-[15px] font-bold h-[48px]"
                          >
                            {contactingId === offer.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              'Contact Dealer'
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Alternative Model Offer (If provided by dealer) */}
                      {offer.alternative_model && offer.alternative_price && (
                        <div className="card-premium border-l-4 border-l-[#FDDB48] bg-[#FDDB48]/5 pl-5 relative overflow-hidden">
                          <div className="absolute top-4 right-4 bg-[#FDDB48] text-[#141414] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px]">
                            Alternative
                          </div>

                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">
                                {offer.dealer.shop_name} Alternate
                              </span>
                              <h5 className="text-[15px] font-bold text-[#141414] mt-1.5">
                                {offer.alternative_model}
                              </h5>
                              <h4 className="text-[28px] font-bold text-[#F0743E] mt-2 leading-none font-mono">
                                ₹{offer.alternative_price.toLocaleString('en-IN')}
                              </h4>
                              
                              <div className="text-[11px] font-semibold text-[#6B6B6B] mt-2">
                                True Cost: <span className="font-bold text-[#141414]">
                                  ₹{getOfferTrueValue(offer.alternative_price, inclusions).toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {offer.alternative_note && (
                            <p className="text-[13px] text-[#6B6B6B] bg-[#FAFAF8] border-[0.5px] border-[#EBEBEB] rounded-[8px] p-3 mt-3 font-normal italic">
                              &ldquo;{offer.alternative_note}&rdquo;
                            </p>
                          )}

                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() => handleContactDealer(offer.id, true)}
                              disabled={contactingId !== null}
                              className="flex-1 btn-secondary h-[44px] text-[13px]"
                            >
                              {contactingId === (offer.id + '-alt') ? (
                                <div className="w-3.5 h-3.5 border-2 border-[#141414] border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                'Accept Alternative Offer'
                              )}
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
          // Online Prices Tab (Fix 1 & Task 9 card border color)
          <div className="space-y-4">
            {online_prices.length === 0 ? (
              <div className="text-center py-16 bg-white border-[0.5px] border-[#EBEBEB] rounded-[16px] flex flex-col items-center">
                <div className="w-12 h-12 bg-[#FAFAF8] border-[0.5px] border-[#EBEBEB] rounded-full flex items-center justify-center text-slate-400 mb-4">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="text-[16px] font-bold text-[#141414]">Fetching online prices...</h3>
                <p className="text-[12px] text-[#6B6B6B] font-medium max-w-xs mt-2 leading-relaxed">
                  Retrieving latest prices from online platforms. Please refresh in a moment.
                </p>
              </div>
            ) : (
              online_prices.map((online) => {
                const isFailed = online.fetch_status === 'failed';
                
                // Border accent colors per platform
                const borderAccent = 
                  online.platform === 'amazon' ? 'border-l-[#FF9900]' : 
                  online.platform === 'flipkart' ? 'border-l-[#2874F0]' : 'border-l-[#CF0A2C]';

                if (isFailed) {
                  return (
                    <div key={online.id} className={`card-premium border-l-4 ${borderAccent} bg-[#FAFAF8]/50`}>
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-[#FAFAF8] border-[0.5px] border-[#EBEBEB] uppercase tracking-wider text-[#141414]">
                        {online.platform}
                      </span>
                      
                      <p className="text-[13px] font-semibold text-[#DC2626] mt-3 leading-relaxed">
                        Online price could not be fetched. Check {online.platform === 'amazon' ? 'Amazon' : 'Flipkart'} directly.
                      </p>
                      
                      <button
                        onClick={() => {
                          const searchUrl = online.platform === 'amazon' 
                            ? `https://www.amazon.in/s?k=${encodeURIComponent(product.model_number)}`
                            : `https://www.flipkart.com/search?q=${encodeURIComponent(product.model_number)}`;
                          window.open(searchUrl, '_blank');
                        }}
                        className="w-full btn-secondary h-[44px] text-[13px] mt-4"
                      >
                        Search {online.platform === 'amazon' ? 'Amazon' : 'Flipkart'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={online.id} className={`card-premium border-l-4 ${borderAccent}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-[#FAFAF8] border-[0.5px] border-[#EBEBEB] uppercase tracking-wider text-[#141414]">
                          {online.platform}
                        </span>
                        
                        {/* Price Details */}
                        <div className="mt-3 flex flex-col gap-1.5">
                          <div className="text-[13px] font-semibold text-[#6B6B6B] flex items-center justify-between gap-12">
                            <span>Product Price:</span>
                            <span className="font-bold text-[#141414]">₹{online.price ? online.price.toLocaleString('en-IN') : 'N/A'}</span>
                          </div>
                          <div className="text-[13px] font-semibold text-[#6B6B6B] flex items-center justify-between">
                            <span>Installation:</span>
                            <span className="font-bold text-[#141414]">₹{online.installation_cost.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="h-[0.5px] bg-[#EBEBEB] my-1"></div>
                          <div className="text-[14px] font-bold text-[#141414] flex items-center justify-between">
                            <span>True Cost:</span>
                            <span className="text-[20px] font-bold text-[#141414] font-mono">₹{online.true_cost ? online.true_cost.toLocaleString('en-IN') : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {online.url && (
                      <button
                        onClick={() => window.open(online.url, '_blank')}
                        className="w-full btn-secondary h-[44px] text-[13px] mt-4"
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
