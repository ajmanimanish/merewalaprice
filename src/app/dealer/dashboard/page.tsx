'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';

interface DealerProfile {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  whatsapp: string;
  area: string;
  city: string;
  categories: string[];
  is_approved: boolean;
}

interface BuyerRequest {
  id: string;
  product_id: string;
  budget: number;
  area: string;
  urgency: string;
  whats_different?: string;
  created_at: string;
  expires_at: string;
  product: {
    name: string;
    brand: string;
    model_number: string;
    category: string;
  };
}

interface DealerOffer {
  id: string;
  price: number;
  inclusions: string[];
  availability: string;
  status: string;
  created_at: string;
  buyer_phone?: string;
  request: {
    id: string;
    budget: number;
    area: string;
    whats_different?: string;
    product: {
      name: string;
      brand: string;
      model_number: string;
      category: string;
    };
  };
}

export default function DealerDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<DealerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'won'>('dashboard');
  const [requestsFilter, setRequestsFilter] = useState<'all' | 'new' | 'responded'>('new');

  // Load active tab from URL query params if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'requests' || tab === 'won' || tab === 'dashboard') {
        setActiveTab(tab);
      }
    }
  }, []);

  // Metrics
  const [listedProductsCount, setListedProductsCount] = useState(20);
  const [requestsList, setRequestsList] = useState<BuyerRequest[]>([]);
  const [wonList, setWonList] = useState<DealerOffer[]>([]); // Contains all submitted quotes
  const [selectedRequest, setSelectedRequest] = useState<BuyerRequest | null>(null);

  // Submit offer modal form
  const [offerPrice, setOfferPrice] = useState('');
  const [inclusions, setInclusions] = useState<string[]>(['Free Install']);
  const [availability, setAvailability] = useState('Today');
  const [note, setNote] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (!s) {
        router.push('/dealer');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        router.push('/dealer');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Load dealer profile and metrics
  useEffect(() => {
    if (!session) return;

    async function loadDealerData() {
      setLoading(true);
      try {
        // Fetch profile using correct column 'email'
        const { data: dl, error } = await supabase
          .from('dealers')
          .select('*')
          .or(`id.eq.${session.user.id},auth_user_id.eq.${session.user.id},email.eq.${session.user.email}`)
          .single();

        if (dl) {
          setProfile(dl);

          // Fetch products listed count
          const { count } = await supabase
            .from('dealer_prices')
            .select('*', { count: 'exact', head: true })
            .eq('dealer_id', dl.id);
          setListedProductsCount(count || 0);

          // Fetch buyer requests matching dealer categories
          const { data: reqData } = await supabase
            .from('buyer_requests')
            .select(`
              id,
              product_id,
              budget,
              area,
              urgency,
              whats_different,
              created_at,
              expires_at,
              product:products(name, brand, model_number, category)
            `)
            .eq('status', 'open')
            .order('created_at', { ascending: false });

          if (reqData) {
            const filtered = (reqData as any[]).filter(
              (r) => r.product && dl.categories.includes(r.product.category)
            );
            setRequestsList(filtered);
          }

          // Fetch won deals
          const { data: offerData } = await supabase
            .from('dealer_offers')
            .select(`
              id,
              price,
              inclusions,
              availability,
              status,
              created_at,
              request:buyer_requests(
                id,
                budget,
                area,
                whats_different,
                buyer_phone,
                phone_shared,
                product:products(name, brand, model_number, category)
              )
            `)
            .eq('dealer_id', dl.id)
            .order('created_at', { ascending: false });

          if (offerData) {
            const mappedWon = (offerData as any[])
              .map((o) => {
                const req = o.request;
                if (!req) return null;
                
                // Real contact number is only shown if phone_shared or won
                const showContact = req.phone_shared || o.status === 'accepted' || o.status === 'won';
                const phone = showContact ? req.buyer_phone || '+91 98765 43210' : undefined;

                return {
                  id: o.id,
                  price: o.price,
                  inclusions: o.inclusions || [],
                  availability: o.availability,
                  status: o.status,
                  created_at: o.created_at,
                  buyer_phone: phone,
                  request: {
                    id: req.id,
                    budget: req.budget,
                    area: req.area,
                    whats_different: req.whats_different,
                    product: req.product || { name: 'Appliance', brand: 'Brand', model_number: 'Model', category: 'AC' }
                  }
                };
              })
              .filter(Boolean) as DealerOffer[];
            setWonList(mappedWon);
          }
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDealerData();
  }, [session]);

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    router.push('/dealer');
  };

  const openOfferModal = (req: BuyerRequest) => {
    setSelectedRequest(req);
    setOfferPrice(String(req.budget));
    setInclusions(['Free Install']);
    setAvailability('Today');
    setNote('');
  };

  const submitOffer = async () => {
    if (!selectedRequest || !profile) return;
    setModalLoading(true);
    try {
      const response = await fetch('/api/dealers/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          dealerId: profile.id,
          price: parseInt(offerPrice, 10),
          inclusions,
          availability,
          alternativeNote: note || null, // Map UI note to API alternativeNote
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to submit offer');
      }

      // Refresh offers list locally
      const newOffer: DealerOffer = {
        id: resData.offerId || Math.random().toString(),
        price: parseInt(offerPrice, 10),
        inclusions,
        availability,
        status: 'pending',
        created_at: new Date().toISOString(),
        request: {
          id: selectedRequest.id,
          budget: selectedRequest.budget,
          area: selectedRequest.area,
          whats_different: selectedRequest.whats_different,
          product: selectedRequest.product
        }
      };

      setWonList([newOffer, ...wonList]);
      setSelectedRequest(null);
      alert('Offer submitted successfully!');
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Error submitting offer. Please try again.');
    } finally {
      setModalLoading(false);
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
          <span className="text-[14px] font-bold text-[#6B6B6B]">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  const shopName = profile?.shop_name || 'Sharma Electronics';
  const shopArea = profile?.area || 'MP Nagar';

  return (
    <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FAFAF8] md:shadow-2xl md:border-x md:border-[#EBEBEB] flex flex-col justify-between font-sans overflow-y-auto pb-[76px] relative">
      <div className="flex flex-col">
        {/* Status Bar */}
        <StatusBar theme="dark" />

        {/* Header */}
        <div style={{ background: '#141414', padding: '8px 20px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{shopName}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(22,163,74,.2)', color: '#4ADE80', fontSize: '9.5px', fontWeight: 800, padding: '3px 7px', borderRadius: '999px' }}>
                ✓ Verified
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#9a9a9a', fontWeight: 600, marginTop: '2px' }}>{shopArea} · Bhopal</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '17px', cursor: 'pointer' }}>🔔</span>
            <span onClick={handleLogOut} style={{ fontSize: '15px', color: '#9a9a9a', cursor: 'pointer' }}>⏻</span>
          </div>
        </div>

        {/* TAB 1: MAIN DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div style={{ padding: '18px 20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Green updated bar */}
            <div style={{ background: '#E7F6ED', border: '1px solid #B7E4C7', borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>✓</span>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#16803D' }}>Prices updated today</span>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize: '26px', fontWeight: 800 }}>47</div>
                <div style={{ fontSize: '12px', color: '#6B6B6B', fontWeight: 600, marginTop: '2px' }}>Views today</div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize: '26px', fontWeight: 800 }}>{requestsList.length}</div>
                <div style={{ fontSize: '12px', color: '#6B6B6B', fontWeight: 600, marginTop: '2px' }}>Enquiries this week</div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize: '26px', fontWeight: 800 }}>{listedProductsCount}</div>
                <div style={{ fontSize: '12px', color: '#6B6B6B', fontWeight: 600, marginTop: '2px' }}>Products listed</div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#16A34A' }}>65%</div>
                <div style={{ fontSize: '12px', color: '#6B6B6B', fontWeight: 600, marginTop: '2px' }}>Win rate</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => router.push('/dealer/prices')} style={{ flex: 1, height: '50px', background: '#F0743E', color: '#fff', border: 'none', borderRadius: '12px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, boxShadow: '0 4px 12px rgba(240,116,62,.3)', cursor: 'pointer' }}>
                Update Prices
              </button>
              <button onClick={() => setActiveTab('requests')} style={{ flex: 1, height: '50px', background: '#fff', color: '#141414', border: '1px solid #EBEBEB', borderRadius: '12px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                View Requests
              </button>
            </div>

            {/* Special Requests Snapshot */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800 }}>
                  Special Requests <span style={{ color: '#F0743E' }}>({requestsList.length} new)</span>
                </span>
                <span onClick={() => setActiveTab('requests')} style={{ fontSize: '12px', fontWeight: 700, color: '#F0743E', cursor: 'pointer' }}>
                  View all →
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {requestsList.slice(0, 2).map((r) => (
                  <div key={r.id} style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '14px', padding: '13px', display: 'flex', gap: '11px', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                      {getCatEmoji(r.product?.category)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>{r.product?.name}</div>
                      <div style={{ fontSize: '11px', color: '#6B6B6B' }}>
                        ₹ {r.budget.toLocaleString()} · {r.area} ·{' '}
                        <span style={{ color: '#DC2626', fontWeight: 700 }}>{r.urgency} 🔥</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '10px' }}>Recent Activity</div>
              <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '6px 14px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                <div style={{ display: 'flex', gap: '11px', padding: '11px 0', borderBottom: '1px solid #EBEBEB' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F0743E', marginTop: '5px', flexShrink: 0 }}></span>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600 }}>Buyer viewed your price</div>
                    <div style={{ fontSize: '11px', color: '#6B6B6B' }}>2 hrs ago</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '11px', padding: '11px 0', borderBottom: '1px solid #EBEBEB' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#CDBCDB', marginTop: '5px', flexShrink: 0 }}></span>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600 }}>New special request matching your shop</div>
                    <div style={{ fontSize: '11px', color: '#6B6B6B' }}>4 hrs ago</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '11px', padding: '11px 0' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A', marginTop: '5px', flexShrink: 0 }}></span>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600 }}>You won a deal! Contact shared</div>
                    <div style={{ fontSize: '11px', color: '#6B6B6B' }}>Yesterday</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SPECIAL REQUESTS LIST (Screen 12) */}
        {activeTab === 'requests' && (() => {
          const respondedRequestIds = new Set(wonList.map(o => o.request.id));
          const displayedRequests = requestsList.filter((r) => {
            const hasResponded = respondedRequestIds.has(r.id);
            if (requestsFilter === 'new') return !hasResponded;
            if (requestsFilter === 'responded') return hasResponded;
            return true; // all
          });

          return (
            <div style={{ minHeight: '844px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '6px 20px 12px' }}><div style={{ fontSize: '18px', fontWeight: 800 }}>Special Requests</div></div>
              <div style={{ display: 'flex', gap: '8px', padding: '0 20px 8px' }}>
                <span 
                  onClick={() => setRequestsFilter('all')}
                  style={{ background: requestsFilter === 'all' ? '#F0743E' : '#fff', color: requestsFilter === 'all' ? '#fff' : '#141414', border: requestsFilter === 'all' ? 'none' : '1px solid #EBEBEB', fontSize: '12px', fontWeight: 700, padding: '7px 16px', borderRadius: '999px', cursor: 'pointer' }}
                >
                  All
                </span>
                <span 
                  onClick={() => setRequestsFilter('new')}
                  style={{ background: requestsFilter === 'new' ? '#F0743E' : '#fff', color: requestsFilter === 'new' ? '#fff' : '#141414', border: requestsFilter === 'new' ? 'none' : '1px solid #EBEBEB', fontSize: '12px', fontWeight: 700, padding: '7px 16px', borderRadius: '999px', cursor: 'pointer' }}
                >
                  New ({requestsList.filter(r => !respondedRequestIds.has(r.id)).length})
                </span>
                <span 
                  onClick={() => setRequestsFilter('responded')}
                  style={{ background: requestsFilter === 'responded' ? '#F0743E' : '#fff', color: requestsFilter === 'responded' ? '#fff' : '#141414', border: requestsFilter === 'responded' ? 'none' : '1px solid #EBEBEB', fontSize: '12px', fontWeight: 700, padding: '7px 16px', borderRadius: '999px', cursor: 'pointer' }}
                >
                  Responded ({wonList.length})
                </span>
              </div>
              
              <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {displayedRequests.length === 0 ? (
                  <div style={{ background: '#fff', border: '1px dashed #EBEBEB', borderRadius: '16px', padding: '24px', textAlign: 'center', color: '#6B6B6B', fontWeight: 600 }}>
                    {requestsFilter === 'new' 
                      ? 'No new buyer requests matching your categories.' 
                      : requestsFilter === 'responded' 
                        ? "You haven't responded to any requests yet." 
                        : 'No requests available.'}
                  </div>
                ) : (
                  displayedRequests.map((r) => {
                    const myOffer = wonList.find(o => o.request.id === r.id);
                    return (
                      <div key={r.id} style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>
                            {getCatEmoji(r.product?.category)}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 800 }}>{r.product?.name}</div>
                            <div style={{ fontSize: '11px', color: '#6B6B6B' }}>{r.product?.model_number}</div>
                          </div>
                        </div>
                        <div style={{ background: '#FAFAF8', borderRadius: '12px', padding: '12px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '11.5px', color: '#6B6B6B', fontWeight: 600 }}>Budget</span><span style={{ fontSize: '12.5px', fontWeight: 700 }}>₹ {r.budget.toLocaleString()}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '11.5px', color: '#6B6B6B', fontWeight: 600 }}>Area</span><span style={{ fontSize: '12.5px', fontWeight: 700 }}>{r.area}</span></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '11.5px', color: '#6B6B6B', fontWeight: 600 }}>Urgency</span><span style={{ fontSize: '12.5px', fontWeight: 700, color: '#DC2626' }}>{r.urgency} 🔥</span></div>
                          {r.whats_different && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '11.5px', color: '#6B6B6B', fontWeight: 600 }}>Special Spec</span><span style={{ fontSize: '12.5px', fontWeight: 700 }}>{r.whats_different}</span></div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                          <span style={{ fontSize: '11px', color: '#6B6B6B', fontWeight: 600 }}>Posted today</span>
                          <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700 }}>Active</span>
                        </div>
                        
                        {myOffer ? (
                          <div style={{ 
                            marginTop: '12px', background: '#F0FDF4', border: '1px solid #BBF7D0', 
                            borderRadius: '12px', padding: '12px', display: 'flex', 
                            justify_content: 'space-between', align_items: 'center' 
                          }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A' }}>✓ Quote Submitted</div>
                              <div style={{ fontSize: '11px', color: '#6B6B6B', marginTop: '2px' }}>
                                Availability: {myOffer.availability} · Note: {myOffer.inclusions.join(', ')}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#16A34A' }}>₹ {myOffer.price.toLocaleString()}</div>
                              <div style={{ fontSize: '9px', fontWeight: 700, color: '#6B6B6B', textTransform: 'uppercase', marginTop: '2px' }}>
                                {myOffer.status}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => openOfferModal(r)}
                            style={{ width: '100%', height: '46px', marginTop: '12px', background: '#F0743E', color: '#fff', border: 'none', borderRadius: '12px', fontFamily: 'inherit', fontSize: '14px', fontWeight: 700, boxShadow: '0 4px 12px rgba(240,116,62,.3)', cursor: 'pointer' }}
                          >
                            Submit My Price
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}

        {/* TAB 3: WON DEALS (Screen 13) */}
        {activeTab === 'won' && (() => {
          const wonDeals = wonList.filter((o) => o.status === 'accepted' || o.status === 'won');

          return (
            <div style={{ minHeight: '844px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '6px 20px 12px' }}><div style={{ fontSize: '18px', fontWeight: 800 }}>Won Deals</div></div>
              <div style={{ display: 'flex', gap: '8px', padding: '0 20px 12px' }}>
                <span style={{ background: '#141414', color: '#fff', fontSize: '12px', fontWeight: 700, padding: '7px 16px', borderRadius: '999px' }}>This Month</span>
                <span style={{ background: '#fff', border: '1px solid #EBEBEB', fontSize: '12px', fontWeight: 600, padding: '7px 16px', borderRadius: '999px' }}>All Time</span>
              </div>
              
              {/* Total Month Won Box */}
              <div style={{ margin: '0 20px', background: '#141414', borderRadius: '16px', padding: '16px 18px', color: '#fff' }}>
                <div style={{ fontSize: '24px', fontWeight: 800 }}>
                  ₹ {wonDeals.reduce((acc, o) => acc + o.price, 0).toLocaleString()}
                </div>
                <div style={{ fontSize: '12.5px', color: '#b5b5b5', fontWeight: 600, marginTop: '2px' }}>
                  in validated sales · {wonDeals.length} deals won
                </div>
              </div>

              {/* List of Won Cards */}
              <div style={{ padding: '16px 20px 4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {wonDeals.length === 0 ? (
                  <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '24px', textAlign: 'center', color: '#6B6B6B', fontWeight: 600 }}>
                    You haven't won any deals yet. Responded offers will show up here once accepted by buyers.
                  </div>
                ) : (
                  wonDeals.map((item) => (
                    <div key={item.id} style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                          {getCatEmoji(item.request.product?.category)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13.5px', fontWeight: 800 }}>{item.request.product?.name}</div>
                          <div style={{ fontSize: '11px', color: '#6B6B6B' }}>{item.request.area} · {new Date(item.created_at).toLocaleDateString()}</div>
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#16A34A' }}>₹ {item.price.toLocaleString()}</div>
                      </div>

                      {item.buyer_phone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', background: '#E7F6ED', borderRadius: '10px', padding: '9px 12px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A' }}></span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#16803D', flex: 1 }}>Buyer Contact Shared</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#16803D' }}>
                            💬 {item.buyer_phone}
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', background: '#FAFAF8', borderRadius: '10px', padding: '9px 12px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F0A63E' }}></span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B6B6B' }}>
                            Buyer is contacting you directly
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Insight Purple Bar */}
              <div style={{ margin: '14px 20px 24px', background: '#F3ECF7', borderRadius: '14px', padding: '14px 16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px' }}>📈</span>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#7A5CA0', lineHeight: 1.4 }}>
                  You won {wonDeals.length} deals this month. Submit competitive prices on special requests to win more customers!
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Screen 12b Bottom Sheet Offer Submission Modal */}
      {selectedRequest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,20,.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '390px', background: '#fff', borderRadius: '24px 24px 0 0', padding: '20px 22px 30px', boxShadow: '0 -8px 30px rgba(0,0,0,.15)', position: 'relative' }}>
            <button
              onClick={() => setSelectedRequest(null)}
              style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#6B6B6B' }}
            >
              ✕
            </button>
            <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#EBEBEB', margin: '0 auto 18px' }}></div>
            
            {/* Header info */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#FAFAF8', borderRadius: '12px', padding: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                {getCatEmoji(selectedRequest.product?.category)}
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800 }}>{selectedRequest.product?.name}</div>
                <div style={{ fontSize: '11px', color: '#6B6B6B' }}>
                  Budget ₹ {selectedRequest.budget.toLocaleString()} · {selectedRequest.area}
                </div>
              </div>
            </div>

            {/* Price input */}
            <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginTop: '16px' }}>
              Your price for this request
            </label>
            <div style={{ background: '#FAFAF8', border: '1.5px solid #F0743E', borderRadius: '12px', padding: '14px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#6B6B6B' }}>₹</span>
              <input
                type="number"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '20px', fontWeight: 800 }}
              />
            </div>

            {/* Inclusions */}
            <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginTop: '14px' }}>Inclusions</label>
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
              {['Free Install', 'Free Pipe', 'Extended Warranty'].map((inc) => {
                const active = inclusions.includes(inc);
                return (
                  <span
                    key={inc}
                    onClick={() => {
                      if (active) {
                        setInclusions(inclusions.filter((x) => x !== inc));
                      } else {
                        setInclusions([...inclusions, inc]);
                      }
                    }}
                    style={{
                      fontSize: '10.5px',
                      fontWeight: active ? '700' : '600',
                      background: active ? '#FBF1EB' : '#FAFAF8',
                      color: active ? '#F0743E' : '#6B6B6B',
                      border: active ? '1px solid #F0743E' : '1px solid #EBEBEB',
                      padding: '6px 11px',
                      borderRadius: '999px',
                      cursor: 'pointer',
                    }}
                  >
                    ✓ {inc}
                  </span>
                );
              })}
            </div>

            {/* Availability */}
            <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginTop: '14px' }}>Availability</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              {['Today', '1–2 days', '4–5 days'].map((time) => {
                const active = time === availability;
                return (
                  <span
                    key={time}
                    onClick={() => setAvailability(time)}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      background: active ? '#F0743E' : '#FAFAF8',
                      border: active ? 'none' : '1px solid #EBEBEB',
                      color: active ? '#fff' : '#141414',
                      fontSize: '12px',
                      fontWeight: active ? '700' : '600',
                      padding: '10px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    {time}
                  </span>
                );
              })}
            </div>

            {/* Note to buyer */}
            <label style={{ fontSize: '13px', fontWeight: 700, display: 'block', marginTop: '14px' }}>
              Note to buyer (optional)
            </label>
            <textarea
              placeholder="Have it in stock, ready for same-day install…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ width: '100%', height: '60px', background: '#FAFAF8', border: '1px solid #EBEBEB', borderRadius: '12px', padding: '12px', marginTop: '8px', fontSize: '12.5px', outline: 'none', resize: 'none' }}
            />

            <button
              onClick={submitOffer}
              disabled={modalLoading}
              style={{ width: '100%', height: '52px', marginTop: '18px', background: '#F0743E', color: '#fff', border: 'none', borderRadius: '12px', fontFamily: 'inherit', fontSize: '15px', fontWeight: 700, boxShadow: '0 6px 16px rgba(240,116,62,.3)', cursor: 'pointer' }}
            >
              {modalLoading ? 'Submitting...' : 'Submit Offer'}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '10px 6px 24px', background: '#fff', borderTop: '1px solid #EBEBEB', position: 'fixed', bottom: 0, left: 'calc(50% - 195px)', width: '100%', maxWidth: '390px', zIndex: 40 }}>
        <div onClick={() => setActiveTab('dashboard')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <span style={{ fontSize: '17px', filter: activeTab === 'dashboard' ? 'none' : 'grayscale(1)', opacity: activeTab === 'dashboard' ? 1 : .55 }}>📊</span>
          <span style={{ fontSize: '9.5px', fontWeight: activeTab === 'dashboard' ? 800 : 600, color: activeTab === 'dashboard' ? '#F0743E' : '#6B6B6B' }}>Dashboard</span>
        </div>
        <Link href="/dealer/prices" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <span style={{ fontSize: '17px', filter: 'grayscale(1)', opacity: .55 }}>🏷️</span>
            <span style={{ fontSize: '9.5px', fontWeight: 600, color: '#6B6B6B' }}>Prices</span>
          </div>
        </Link>
        <div onClick={() => setActiveTab('requests')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <span style={{ fontSize: '17px', filter: activeTab === 'requests' ? 'none' : 'grayscale(1)', opacity: activeTab === 'requests' ? 1 : .55 }}>📩</span>
          <span style={{ fontSize: '9.5px', fontWeight: activeTab === 'requests' ? 800 : 600, color: activeTab === 'requests' ? '#F0743E' : '#6B6B6B' }}>Requests</span>
        </div>
        <div onClick={() => setActiveTab('won')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <span style={{ fontSize: '17px', filter: activeTab === 'won' ? 'none' : 'grayscale(1)', opacity: activeTab === 'won' ? 1 : .55 }}>🏆</span>
          <span style={{ fontSize: '9.5px', fontWeight: activeTab === 'won' ? 800 : 600, color: activeTab === 'won' ? '#F0743E' : '#6B6B6B' }}>Won</span>
        </div>
        <Link href="/dealer/profile" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <span style={{ fontSize: '17px', filter: 'grayscale(1)', opacity: .55 }}>👤</span>
            <span style={{ fontSize: '9.5px', fontWeight: 600, color: '#6B6B6B' }}>Profile</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
