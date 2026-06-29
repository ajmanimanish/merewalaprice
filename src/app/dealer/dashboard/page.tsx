'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  Store, 
  Lock, 
  Phone, 
  LogOut, 
  Inbox, 
  History, 
  BarChart3, 
  Plus, 
  CheckCircle2, 
  IndianRupee,
  BadgeAlert,
  HelpCircle
} from 'lucide-react';

interface DealerProfile {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  whatsapp: string;
  area: string;
  categories: string[];
  is_approved: boolean;
  subscription_status: string;
}

interface BuyerRequest {
  id: string;
  budget: number;
  area: string;
  urgency: string;
  purchase_type: string;
  quantity: number;
  created_at: string;
  status: string;
  expires_at: string;
  product: {
    name: string;
    brand: string;
    model_number: string;
    category: string;
    image_url?: string;
  };
}

interface DealerOffer {
  id: string;
  price: number;
  inclusions: string[];
  availability: string;
  status: string;
  created_at: string;
  alternative_model?: string;
  alternative_price?: number;
  alternative_note?: string;
  request: {
    buyer_name: string;
    status: string;
    product: {
      name: string;
      brand: string;
      model_number: string;
    };
  };
}

export default function DealerDashboard() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<DealerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Current time state for live countdown
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Dashboard Tabs
  const [activeTab, setActiveTab] = useState<'requests' | 'offers' | 'stats'>('requests');
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [offers, setOffers] = useState<DealerOffer[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Quote Modal States
  const [selectedRequest, setSelectedRequest] = useState<BuyerRequest | null>(null);
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteInclusions, setQuoteInclusions] = useState<string[]>([]);
  const [quoteAvailability, setQuoteAvailability] = useState('today');
  
  // Alt Model States
  const [hasAltModel, setHasAltModel] = useState(false);
  const [altModelName, setAltModelName] = useState('');
  const [altModelPrice, setAltModelPrice] = useState('');
  const [altModelNote, setAltModelNote] = useState('');
  
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // 1. Fetch Session on Mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Profile once Session is available
  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }

    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const { data, error } = await supabase
          .from('dealers')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .single();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        console.error('Fetch profile error:', err);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [session]);

  // Track ticking time for reactive expired elements
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000); // 10 seconds tick
    return () => clearInterval(timer);
  }, []);

  // 3. Fetch Dashboard Data (Requests & Offers)
  const fetchDashboardData = async () => {
    if (!profile || !profile.is_approved) return;
    setDataLoading(true);
    try {
      const { data: reqData, error: reqErr } = await supabase
        .from('buyer_requests')
        .select(`
          id, budget, area, urgency, purchase_type, quantity, created_at, status, expires_at,
          product:products(name, brand, model_number, category, image_url)
        `)
        .in('status', ['open', 'fulfilled'])
        .order('created_at', { ascending: false });

      if (reqErr) throw reqErr;
      
      const filteredReqs = (reqData || []).filter((req: any) => 
        req.product && profile.categories.includes(req.product.category)
      ) as unknown as BuyerRequest[];

      // Fetch submitted offers
      const { data: offerData, error: offerErr } = await supabase
        .from('dealer_offers')
        .select(`
          id, price, inclusions, availability, status, created_at, alternative_model, alternative_price, alternative_note,
          request:buyer_requests(
            buyer_name, status,
            product:products(name, brand, model_number)
          )
        `)
        .eq('dealer_id', profile.id)
        .order('created_at', { ascending: false });

      if (offerErr) throw offerErr;

      // Filter out requests that the dealer has already quoted for
      const quotedRequestIds = new Set((offerData || []).map((o: any) => o.request_id || (o.request ? o.request.id : '')));
      const unquotedReqs = filteredReqs.filter(r => !quotedRequestIds.has(r.id));

      setRequests(unquotedReqs);
      setOffers((offerData || []) as unknown as DealerOffer[]);
    } catch (err) {
      console.error('Fetch dashboard data error:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (profile && profile.is_approved) {
      fetchDashboardData();
    }
  }, [profile]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (!loginEmail || !loginEmail.includes('@')) {
      setLoginError('Please enter a valid email address.');
      return;
    }

    if (!loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }

    setLoginSubmitting(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });

      if (error) throw new Error('Invalid email or password.');
    } catch (err: any) {
      setLoginError(err.message || 'Login failed.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRequests([]);
    setOffers([]);
  };

  // Inclusion toggle
  const handleInclusionToggle = (val: string) => {
    setQuoteInclusions(prev => 
      prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val]
    );
  };

  // Submit quote handler
  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!selectedRequest || !profile) return;
    if (!quotePrice) {
      setModalError('Price quote is required.');
      return;
    }

    if (hasAltModel && (!altModelName || !altModelPrice)) {
      setModalError('Please specify model name and price for alternative offer.');
      return;
    }

    setModalSubmitting(true);

    try {
      const response = await fetch('/api/dealers/offers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          dealerId: profile.id,
          price: parseInt(quotePrice, 10),
          inclusions: quoteInclusions,
          availability: quoteAvailability,
          alternativeModel: hasAltModel ? altModelName : null,
          alternativePrice: hasAltModel ? parseInt(altModelPrice, 10) : null,
          alternativeNote: hasAltModel ? altModelNote : null,
        }),
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to submit quote');

      // Clear modal and close
      setSelectedRequest(null);
      setQuotePrice('');
      setQuoteInclusions([]);
      setQuoteAvailability('today');
      setHasAltModel(false);
      setAltModelName('');
      setAltModelPrice('');
      setAltModelNote('');
      
      // Refresh Dashboard
      fetchDashboardData();
    } catch (err: any) {
      setModalError(err.message || 'Quote submit failed.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Expiration layout badges generator (Fix 7 & urgency badge colors)
  const renderRemainingTimeBadge = (expiresAtStr: string) => {
    const expiresAt = new Date(expiresAtStr).getTime();
    const diffMs = expiresAt - currentTime;
    
    if (diffMs <= 0) {
      return null;
    }
    
    const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
    
    if (diffMinutes < 30) {
      // Under 30 minutes: Background #FFEBEB, text #DC2626, pulse
      return (
        <span className="text-[10px] font-bold text-[#DC2626] bg-[#FFEBEB] border-[0.5px] border-[#DC2626]/20 px-2.5 py-0.5 rounded-[6px] animate-pulse uppercase tracking-wider">
          {diffMinutes} min left
        </span>
      );
    } else if (diffMinutes < 60) {
      // Under 1 hour: Background #FEF0E8, text #F0743E
      return (
        <span className="text-[10px] font-bold text-[#F0743E] bg-[#FEF0E8] border-[0.5px] border-[#F6C3AE] px-2.5 py-0.5 rounded-[6px] uppercase tracking-wider">
          {diffMinutes} min left
        </span>
      );
    } else {
      const hours = Math.round(diffMinutes / 60);
      return (
        <span className="text-[10px] font-bold text-[#F0743E] bg-[#FEF0E8] border-[0.5px] border-[#F6C3AE] px-2.5 py-0.5 rounded-[6px] uppercase tracking-wider">
          {hours} hours left
        </span>
      );
    }
  };

  // Separate requests by active and expired status
  const activeRequests = requests.filter(
    (req) => req.status === 'open' && new Date(req.expires_at).getTime() > currentTime
  );
  
  const expiredRequests = requests.filter(
    (req) => req.status === 'open' && new Date(req.expires_at).getTime() <= currentTime
  );

  const fulfilledRequests = requests.filter(
    (req) => req.status === 'fulfilled'
  );

  // Stats calculation
  const offersCount = offers.length;
  const wonOffers = offers.filter(o => o.status === 'accepted');
  const wonCount = wonOffers.length;
  const conversionRate = offersCount > 0 ? Math.round((wonCount / offersCount) * 100) : 0;
  const totalValueWon = wonOffers.reduce((sum, o) => sum + o.price, 0);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAF8]">
        <div className="w-8 h-8 border-4 border-[#F0743E] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Not Logged In View
  if (!session) {
    return (
      <div className="flex flex-col min-h-screen justify-center px-5 py-12 bg-[#FAFAF8] font-sans">
        <div className="w-full bg-white border-[0.5px] border-[#EBEBEB] p-6 rounded-[16px] flex flex-col">
          <div className="text-center mb-6">
            <h1 className="text-[20px] font-bold text-[#141414] tracking-tight">MereWala<span className="text-[#F0743E]">Price</span></h1>
            <p className="text-[12px] font-bold text-[#6B6B6B] uppercase tracking-wider mt-2">Dealer Login</p>
          </div>

          {loginError && (
            <div className="bg-red-50 border-[0.5px] border-red-200 text-[#DC2626] text-xs font-semibold rounded p-3 mb-4">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-[#F0743E]" />
                Email Address
              </label>
              <input
                type="email"
                placeholder="dealer@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="input-premium"
                disabled={loginSubmitting}
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-[#F0743E]" />
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="input-premium"
                disabled={loginSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={loginSubmitting}
              className="w-full btn-primary mt-2"
            >
              {loginSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="text-center mt-6 pt-4 border-t border-[#EBEBEB]">
            <Link href="/dealer/register" className="text-xs text-[#F0743E] font-bold hover:underline">
              New dukaan? Register here ➡️
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Profile Loading View
  if (profileLoading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAF8]">
        <div className="text-center font-bold text-sm text-[#6B6B6B]">Loading Profile...</div>
      </div>
    );
  }

  // Profile registered but pending approval
  if (!profile.is_approved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-[#FAFAF8] font-sans">
        <div className="p-4 bg-[#FEF0E8] text-[#F0743E] border-[0.5px] border-[#F6C3AE] rounded-full mb-6">
          <BadgeAlert className="w-12 h-12" />
        </div>
        <h1 className="text-[20px] font-bold text-[#141414]">Registration Pending</h1>
        <p className="text-[13px] font-semibold text-[#6B6B6B] mt-2">Shop: {profile.shop_name}</p>
        
        <p className="text-[12px] text-[#A0A0A0] font-medium mt-4 max-w-sm leading-relaxed">
          Your account has been created. Admin will review and approve within 24 hours.
        </p>

        <button 
          onClick={handleLogout}
          className="btn-secondary mt-8 h-[44px] text-xs px-6"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FAFAF8] pb-16 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b-[0.5px] border-[#EBEBEB] px-5 py-4 flex items-center justify-between shadow-none flex-shrink-0">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-[#F0743E]" />
          <div>
            <h1 className="text-[14px] font-bold text-[#141414] leading-none">{profile.shop_name}</h1>
            <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider">
              {profile.area} • Partner Dashboard
            </span>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="text-xs text-[#A0A0A0] hover:text-[#DC2626] font-bold flex items-center gap-1 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </header>

      {/* Tabs bar */}
      <div className="flex border-b border-[#EBEBEB] bg-white flex-shrink-0">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-3 text-center text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'requests'
              ? 'border-[#F0743E] text-[#F0743E]'
              : 'border-transparent text-[#6B6B6B] hover:text-[#141414]'
          }`}
        >
          <Inbox className="w-4 h-4" />
          New Requests ({activeRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('offers')}
          className={`flex-1 py-3 text-center text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'offers'
              ? 'border-[#F0743E] text-[#F0743E]'
              : 'border-transparent text-[#6B6B6B] hover:text-[#141414]'
          }`}
        >
          <History className="w-4 h-4" />
          My Offers ({offers.length})
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-3 text-center text-xs font-bold border-b-2 flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'stats'
              ? 'border-[#F0743E] text-[#F0743E]'
              : 'border-transparent text-[#6B6B6B] hover:text-[#141414]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Stats
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-5 flex-1">
        {dataLoading ? (
          <div className="text-center py-12 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-[#F0743E] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-[#A0A0A0] font-bold">Refreshing...</span>
          </div>
        ) : activeTab === 'requests' ? (
          // Requests Listing
          <div className="space-y-6">
            {/* Active Requests */}
            <div className="space-y-4">
              {activeRequests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-[16px] border-[0.5px] border-[#EBEBEB] p-6 flex flex-col items-center">
                  <div className="w-12 h-12 bg-[#FAFAF8] border-[0.5px] border-[#EBEBEB] rounded-full flex items-center justify-center text-[#6B6B6B] mb-3">
                    <Inbox className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-[#141414]">No New Requests</h3>
                  <p className="text-xs text-[#A0A0A0] font-medium mt-1 max-w-[200px] leading-relaxed">
                    You will see requests here once buyers request products in your categories.
                  </p>
                </div>
              ) : (
                activeRequests.map((req) => {
                  // Left border color based on urgency
                  const urgencyBorder = 
                    req.urgency === 'today' ? 'border-l-[#F0743E]' :
                    req.urgency === 'this_week' ? 'border-l-[#FDDB48]' : 'border-l-[#EBEBEB]';

                  return (
                    <div key={req.id} className={`card-premium border-l-[3px] ${urgencyBorder}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="inline-block text-[9px] font-bold bg-[#FAFAF8] border-[0.5px] border-[#EBEBEB] px-2 py-0.5 rounded-full uppercase tracking-wider text-[#6B6B6B]">
                          {req.product.brand}
                        </span>
                        {renderRemainingTimeBadge(req.expires_at)}
                      </div>
                      
                      <h3 className="text-[15px] font-bold text-[#141414] truncate leading-none">
                        {req.product.name}
                      </h3>
                      <p className="text-[11px] text-[#A0A0A0] font-bold mt-1">
                        Model: {req.product.model_number}
                      </p>
                      
                      {/* Buyer detail panel */}
                      <div className="bg-[#FAFAF8] border-[0.5px] border-[#EBEBEB] rounded-[12px] p-3.5 my-4 space-y-1.5 text-xs font-semibold text-[#6B6B6B]">
                        <div className="flex justify-between">
                          <span>Buyer Budget:</span>
                          <strong className="text-[#141414] font-bold">₹{req.budget.toLocaleString('en-IN')}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Location:</span>
                          <span className="text-[#141414]">{req.area}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Urgency:</span>
                          <span className="text-[#141414]">
                            {req.urgency === 'today' ? 'Need Today' : req.urgency === 'this_week' ? 'This Week' : 'Price Check'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="w-full btn-primary h-[44px] text-[13px]"
                      >
                        Submit Offer
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Fulfilled Requests Section */}
            {fulfilledRequests.length > 0 && (
              <div className="pt-6 border-t border-[#EBEBEB]">
                <h4 className="text-[12px] font-bold text-[#A0A0A0] uppercase tracking-wider mb-3">
                  Fulfilled Requests ({fulfilledRequests.length})
                </h4>
                <div className="space-y-4">
                  {fulfilledRequests.map((req) => (
                    <div key={req.id} className="card-premium border-l-[3px] border-l-[#EBEBEB] bg-[#FAFAF8]/50 pl-5">
                      <div className="flex justify-between items-start mb-2">
                        <span className="inline-block text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {req.product.brand}
                        </span>
                        <span className="text-[10px] font-bold text-[#16A34A] bg-green-50 border-[0.5px] border-green-200 px-2 py-0.5 rounded-[6px]">
                          Request Fulfilled
                        </span>
                      </div>
                      <h3 className="text-[15px] font-bold text-[#141414] truncate leading-none">
                        {req.product.name}
                      </h3>
                      <p className="text-[11px] text-[#A0A0A0] font-bold mt-1">
                        Model: {req.product.model_number}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expired Requests Section */}
            {expiredRequests.length > 0 && (
              <div className="pt-6 border-t border-[#EBEBEB]">
                <h4 className="text-[12px] font-bold text-[#A0A0A0] uppercase tracking-wider mb-3">
                  Expired Requests ({expiredRequests.length})
                </h4>
                <div className="space-y-4 opacity-60">
                  {expiredRequests.map((req) => (
                    <div key={req.id} className="card-premium border-l-[3px] border-l-[#EBEBEB] bg-[#FAFAF8] pl-5">
                      <div className="flex justify-between items-start mb-2">
                        <span className="inline-block text-[9px] font-bold bg-[#EBEBEB] text-[#A0A0A0] px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {req.product.brand}
                        </span>
                        <span className="text-[10px] font-bold text-[#A0A0A0] bg-[#EBEBEB] px-2 py-0.5 rounded-[6px]">
                          Expired
                        </span>
                      </div>
                      <h3 className="text-[15px] font-bold text-[#141414] truncate leading-none">
                        {req.product.name}
                      </h3>
                      <p className="text-[11px] text-[#A0A0A0] font-bold mt-1">
                        Model: {req.product.model_number}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'offers' ? (
          // Offers Listing
          <div className="space-y-4">
            {offers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-[16px] border-[0.5px] border-[#EBEBEB] p-6 flex flex-col items-center">
                <div className="w-12 h-12 bg-[#FAFAF8] border-[0.5px] border-[#EBEBEB] rounded-full flex items-center justify-center text-slate-400 mb-3">
                  <History className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#141414]">No submitted offers</h3>
                <p className="text-xs text-[#A0A0A0] font-medium mt-1 max-w-[200px] leading-relaxed">
                  Submit offers on active requests to see your bids here.
                </p>
              </div>
            ) : (
              offers.map((offer) => {
                const isAccepted = offer.status === 'accepted';
                const isRequestFulfilled = offer.request.status === 'fulfilled';
                
                return (
                  <div 
                    key={offer.id} 
                    className={`card-premium relative overflow-hidden ${
                      isAccepted 
                        ? 'border-l-4 border-l-[#16A34A] bg-green-50/10' 
                        : isRequestFulfilled 
                        ? 'bg-[#FAFAF8]/50'
                        : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-[12px] font-bold text-[#A0A0A0] truncate uppercase max-w-[180px]">
                          {offer.request.product.brand} {offer.request.product.name}
                        </h4>
                        <div className="text-[24px] font-bold text-[#141414] mt-1.5 leading-none font-mono">
                          ₹{offer.price.toLocaleString('en-IN')}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isAccepted ? 'text-emerald-700 bg-emerald-100' :
                          offer.status === 'rejected' ? 'text-red-700 bg-red-100' :
                          'text-orange-700 bg-orange-100'
                        }`}>
                          {offer.status}
                        </span>
                        
                        {isRequestFulfilled && !isAccepted && (
                          <span className="text-[10px] font-bold text-[#A0A0A0] bg-[#EBEBEB] px-1.5 py-0.5 rounded-[4px]">
                            Request Fulfilled
                          </span>
                        )}
                      </div>
                    </div>

                    {offer.alternative_model && (
                      <div className="bg-[#FEF0E8] border-[0.5px] border-[#F6C3AE] rounded-[8px] p-2.5 mt-3.5 text-xs text-[#F0743E] font-bold">
                        Alternate: {offer.alternative_model} (₹{offer.alternative_price?.toLocaleString('en-IN')})
                      </div>
                    )}

                    {/* Winner Detail panel */}
                    {isAccepted && (
                      <div className="bg-[#16A34A] text-white rounded-[12px] p-4 mt-4 flex flex-col gap-2 shadow-none">
                        <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 fill-white text-[#16A34A]" />
                          Deal Won!
                        </div>
                        <div className="text-xs font-semibold">
                          Buyer Name: {offer.request.buyer_name ? offer.request.buyer_name.split(' ')[0] : 'Buyer'}
                        </div>
                        <p className="text-[11px] text-emerald-100 font-medium">
                          The buyer has been shared your contact details. They will contact you directly via WhatsApp shortly.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          // Stats Panel
          <div className="space-y-4">
            <span className="text-[12px] font-bold text-[#A0A0A0] tracking-wider uppercase block mb-2">
              Performance Metrics
            </span>

            <div className="bg-white rounded-[16px] border-[0.5px] border-[#EBEBEB] p-5 grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[#A0A0A0] uppercase tracking-wider">Offers Quoted</span>
                <span className="text-[28px] font-bold text-[#141414] mt-1.5 leading-none font-mono">{offersCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[#A0A0A0] uppercase tracking-wider">Deals Won</span>
                <span className="text-[28px] font-bold text-[#16A34A] mt-1.5 leading-none font-mono">{wonCount}</span>
              </div>
            </div>

            <div className="bg-white rounded-[16px] border-[0.5px] border-[#EBEBEB] p-5 grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[#A0A0A0] uppercase tracking-wider">Conversion Rate</span>
                <span className="text-[28px] font-bold text-[#141414] mt-1.5 leading-none font-mono">{conversionRate}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-[#A0A0A0] uppercase tracking-wider">Total Sales</span>
                <span className="text-[28px] font-bold text-[#F0743E] mt-1.5 leading-none font-mono">₹{totalValueWon.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quote Submission Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-[#141414]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[390px] rounded-[16px] border-[0.5px] border-[#EBEBEB] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#FAFAF8] border-b border-[#EBEBEB] px-4 py-3.5 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-[#141414] uppercase tracking-wider">Submit Price Quote</h3>
                <span className="text-[11px] font-bold text-[#A0A0A0]">Budget: ₹{selectedRequest.budget.toLocaleString('en-IN')}</span>
              </div>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="text-xs font-bold text-[#A0A0A0] hover:text-[#141414] bg-[#EBEBEB]/50 w-5 h-5 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleQuoteSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
              {modalError && (
                <div className="bg-red-50 border-[0.5px] border-red-200 text-[#DC2626] text-xs font-bold rounded p-3">
                  {modalError}
                </div>
              )}

              {/* Price field */}
              <div>
                <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 text-[#F0743E]" />
                  Your Price Quote (GST Incl.)
                </label>
                <div className="relative rounded-[12px]">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-[#6B6B6B] font-bold text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    placeholder="34200"
                    value={quotePrice}
                    onChange={(e) => setQuotePrice(e.target.value)}
                    className="input-premium pl-7 py-2 font-bold text-sm"
                    min="1"
                    disabled={modalSubmitting}
                  />
                </div>
              </div>

              {/* Inclusions checklist */}
              <div>
                <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-2">
                  Offer Inclusions
                </label>
                <div className="grid grid-cols-2 gap-2 bg-[#FAFAF8] p-3 rounded-[12px] border-[0.5px] border-[#EBEBEB]">
                  {[
                    'Free Installation',
                    'Extra Warranty',
                    'Free Stabilizer',
                    '0% EMI Offer'
                  ].map((inc) => (
                    <label key={inc} className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold text-[#141414]">
                      <input
                        type="checkbox"
                        checked={quoteInclusions.includes(inc)}
                        onChange={() => handleInclusionToggle(inc)}
                        className="w-3.5 h-3.5 rounded text-[#F0743E] focus:ring-[#F0743E]/20 border-[#EBEBEB]"
                        disabled={modalSubmitting}
                      />
                      <span>{inc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Availability selection */}
              <div>
                <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-2">
                  Stock Availability
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'today', label: 'In Stock' },
                    { id: '1-2days', label: '1-2 Days' },
                    { id: '4-5days', label: '4-5 Days' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setQuoteAvailability(opt.id)}
                      className={`pill-selector border-none text-[11px] font-bold ${
                        quoteAvailability === opt.id
                          ? 'pill-selector-active'
                          : 'bg-[#FAFAF8] text-[#6B6B6B] hover:bg-[#EBEBEB]/40'
                      }`}
                      disabled={modalSubmitting}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alternative model toggle */}
              <div className="pt-2 border-t border-[#EBEBEB]">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={hasAltModel}
                    onChange={() => setHasAltModel(!hasAltModel)}
                    className="w-3.5 h-3.5 rounded text-[#F0743E] focus:ring-[#F0743E]/20 border-[#EBEBEB]"
                    disabled={modalSubmitting}
                  />
                  <span>Offer Alternative Model</span>
                </label>
              </div>

              {/* Alternative model fields */}
              {hasAltModel && (
                <div className="bg-[#FAFAF8] border-[0.5px] border-[#EBEBEB] p-3.5 rounded-[12px] space-y-3.5 mt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider mb-1">
                      Alt Model Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. LG Inverter 1.5T"
                      value={altModelName}
                      onChange={(e) => setAltModelName(e.target.value)}
                      className="input-premium bg-white"
                      disabled={modalSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider mb-1">
                      Alt Model Price
                    </label>
                    <input
                      type="number"
                      placeholder="32000"
                      value={altModelPrice}
                      onChange={(e) => setAltModelPrice(e.target.value)}
                      className="input-premium bg-white"
                      disabled={modalSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#6B6B6B] uppercase tracking-wider mb-1">
                      Alt Note/Offer (Inclusions)
                    </label>
                    <textarea
                      placeholder="e.g. Copper coil, stabilizer included!"
                      value={altModelNote}
                      onChange={(e) => setAltModelNote(e.target.value)}
                      className="input-premium bg-white resize-none h-16 py-2"
                      disabled={modalSubmitting}
                    />
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={modalSubmitting}
                className="w-full btn-primary text-xs py-2.5 font-extrabold mt-4"
              >
                {modalSubmitting ? 'Submitting Quote...' : 'Submit Quote'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
