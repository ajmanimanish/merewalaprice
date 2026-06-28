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
    buyer_phone: string;
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
  
  // Current time state for live countdown (Fix 7)
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  // Login Form States
  const [loginPhone, setLoginPhone] = useState('');
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
      // Fetch open and fulfilled requests matching the dealer
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
            buyer_name, buyer_phone, status,
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
    
    const cleanPhone = loginPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      setLoginError('Kripya 10-digit phone number enter karein.');
      return;
    }

    if (!loginPassword) {
      setLoginError('Password enter karein.');
      return;
    }

    setLoginSubmitting(true);
    
    try {
      const email = `${cleanPhone}@merawalaprice.in`;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

      if (error) throw new Error('Password galat hai ya user nahi mila.');
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
      setModalError('Price quote dalna mandatory hai.');
      return;
    }

    if (hasAltModel && (!altModelName || !altModelPrice)) {
      setModalError('Alt Model select kiya hai toh Model Name aur Price fill karein.');
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

  // Expiration layout badges generator (Fix 7)
  const renderRemainingTimeBadge = (expiresAtStr: string) => {
    const expiresAt = new Date(expiresAtStr).getTime();
    const diffMs = expiresAt - currentTime;
    
    if (diffMs <= 0) {
      return null;
    }
    
    const diffHours = diffMs / (60000 * 60);
    if (diffHours >= 1) {
      const hours = Math.round(diffHours);
      return (
        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
          ⏰ {hours} ghante bacha hai
        </span>
      );
    } else {
      const minutes = Math.max(1, Math.round(diffMs / 60000));
      return (
        <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded animate-pulse">
          ⚡ Sirf {minutes} minute bacha hai!
        </span>
      );
    }
  };

  // Separate requests by active and expired status (Fix 7)
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
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Not Logged In View
  if (!session) {
    return (
      <div className="flex flex-col min-h-screen justify-center px-6 py-12 bg-slate-50/50">
        <div className="w-full bg-white border border-slate-100 p-6 rounded-card shadow-lg flex flex-col">
          <div className="text-center mb-6">
            <h1 className="font-baloo text-3xl font-extrabold text-primary">MereWalaPrice</h1>
            <p className="text-sm font-bold text-slate-800 mt-2">Bhopal Dealer Panel Login</p>
            <p className="text-xs text-slate-400 font-semibold mt-1">Dukaan ke offer quotes aur stats manage karein.</p>
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded p-3 mb-4">
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-primary" />
                WhatsApp Mobile Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                className="input-premium py-2 text-sm font-semibold"
                disabled={loginSubmitting}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-primary" />
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="input-premium py-2 text-sm font-semibold"
                disabled={loginSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={loginSubmitting}
              className="w-full btn-primary py-2.5 text-sm font-extrabold"
            >
              {loginSubmitting ? 'Logging in...' : 'Sign In'}
            </button>
          </form>

          <div className="text-center mt-6 pt-4 border-t border-slate-100">
            <Link href="/dealer/register" className="text-xs text-primary font-bold hover:underline">
              Nayi dukaan hai? Partner Register karein ➡️
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Profile Loading View
  if (profileLoading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center font-bold text-sm text-slate-500">Loading Profile...</div>
      </div>
    );
  }

  // Profile registered but pending approval
  if (!profile.is_approved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center bg-slate-50">
        <div className="p-4 bg-orange-50 text-primary border border-orange-100 rounded-full mb-6">
          <BadgeAlert className="w-12 h-12" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Registration Pending</h1>
        <p className="text-sm font-extrabold text-slate-800 mt-2">Dukaan: {profile.shop_name}</p>
        
        <p className="text-xs text-slate-500 font-semibold mt-4 max-w-sm leading-relaxed">
          Aapka account create ho gaya hai. Admin check karke ise 24 ghante me approve karenge. Approved hote hi active requests yahan dikhne lagenge.
        </p>

        <button 
          onClick={handleLogout}
          className="btn-secondary mt-8 text-xs font-bold py-2.5 px-6 flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-16">
      {/* Logged In Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-5 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 leading-none">{profile.shop_name}</h1>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              📍 {profile.area} • APPROVED DEALER
            </span>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="text-xs text-slate-400 hover:text-red-500 font-bold flex items-center gap-1 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-3 text-center text-xs font-extrabold border-b-2 flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'requests'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Inbox className="w-4 h-4" />
          New Requests ({activeRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('offers')}
          className={`flex-1 py-3 text-center text-xs font-extrabold border-b-2 flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'offers'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <History className="w-4 h-4" />
          My Offers ({offers.length})
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-3 text-center text-xs font-extrabold border-b-2 flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'stats'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
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
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-400 font-bold">Refreshing data...</span>
          </div>
        ) : activeTab === 'requests' ? (
          // Requests Listing
          <div className="space-y-6">
            {/* Active Requests */}
            <div className="space-y-4">
              {activeRequests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-card border border-slate-100 p-6 shadow-sm flex flex-col items-center">
                  <div className="w-12 h-12 bg-slate-50 border border-slate-200/50 rounded-full flex items-center justify-center text-slate-400 mb-3">
                    <Inbox className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">Koi Active Requests Nahi Hai</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 max-w-[200px]">
                    Jaise hi koi buyer aapki category me post karega, yahan notification aayega!
                  </p>
                </div>
              ) : (
                activeRequests.map((req) => (
                  <div key={req.id} className="card-premium">
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-block text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {req.product.brand}
                      </span>
                      {renderRemainingTimeBadge(req.expires_at)}
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-950 truncate leading-none">
                      {req.product.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                      Model: {req.product.model_number}
                    </p>
                    
                    {/* Buyer detail panel */}
                    <div className="bg-slate-50 border border-slate-100 rounded-card p-3 my-3.5 space-y-1.5 text-xs font-semibold text-slate-600">
                      <div className="flex justify-between">
                        <span>Buyer Budget:</span>
                        <strong className="text-slate-900 font-extrabold">₹{req.budget.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Location:</span>
                        <span className="text-slate-800">{req.area}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Urgency:</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 bg-white rounded border border-slate-200 ${
                          req.urgency === 'today' ? 'text-red-600 border-red-200' : 'text-slate-700'
                        }`}>
                          {req.urgency === 'today' ? 'Aaj hi 🔥' : req.urgency === 'this_week' ? 'Is hafte' : 'Price check'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedRequest(req)}
                      className="w-full btn-primary text-xs py-2 font-extrabold flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      Submit Offer
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Fulfilled Requests Section (Fix 9) */}
            {fulfilledRequests.length > 0 && (
              <div className="pt-6 border-t border-slate-200">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                  Fulfilled Requests ({fulfilledRequests.length})
                </h4>
                <div className="space-y-4">
                  {fulfilledRequests.map((req) => (
                    <div key={req.id} className="card-premium border-slate-200 bg-slate-50/50 pl-5 relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="inline-block text-[9px] font-black bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {req.product.brand}
                        </span>
                        <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                          ✅ Request Fulfill Ho Gayi
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-950 truncate leading-none">
                        {req.product.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">
                        Model: {req.product.model_number}
                      </p>
                      
                      <div className="bg-white border border-slate-100 rounded-card p-3 my-3 space-y-1 text-xs font-semibold text-slate-500">
                        <div className="flex justify-between">
                          <span>Budget:</span>
                          <span className="text-slate-800">₹{req.budget.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Location:</span>
                          <span className="text-slate-800">{req.area}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expired Requests Section (Fix 7) */}
            {expiredRequests.length > 0 && (
              <div className="pt-6 border-t border-slate-200">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                  Expired Requests ({expiredRequests.length})
                </h4>
                <div className="space-y-4 opacity-70">
                  {expiredRequests.map((req) => (
                    <div key={req.id} className="card-premium border-slate-200 bg-slate-100 pl-5 relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-400"></div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="inline-block text-[9px] font-black bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {req.product.brand}
                        </span>
                        <span className="text-[9px] font-black text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                          ⌛ Expired (Time Up)
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-950 truncate leading-none">
                        {req.product.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">
                        Model: {req.product.model_number}
                      </p>
                      
                      <div className="bg-white border border-slate-100 rounded-card p-3 my-3 space-y-1 text-xs font-semibold text-slate-500">
                        <div className="flex justify-between">
                          <span>Budget:</span>
                          <span className="text-slate-800">₹{req.budget.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Location:</span>
                          <span className="text-slate-800">{req.area}</span>
                        </div>
                      </div>
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
              <div className="text-center py-12 bg-white rounded-card border border-slate-100 p-6 shadow-sm flex flex-col items-center">
                <div className="w-12 h-12 bg-slate-50 border border-slate-200/50 rounded-full flex items-center justify-center text-slate-400 mb-3">
                  <History className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Pehle koi bids nahi kiye hain</h3>
                <p className="text-xs text-slate-500 font-medium mt-1 max-w-[200px]">
                  New Requests par offer submit karein, details yahan dikhenge.
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
                        ? 'border-emerald-300 bg-emerald-50/20 ring-2 ring-emerald-500/10' 
                        : isRequestFulfilled 
                        ? 'border-slate-200 bg-slate-50/30'
                        : 'border-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 truncate uppercase max-w-[180px]">
                          {offer.request.product.brand} {offer.request.product.name}
                        </h4>
                        <div className="text-lg font-black text-slate-950 mt-1 leading-none">
                          ₹{offer.price.toLocaleString('en-IN')}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isAccepted ? 'text-emerald-700 bg-emerald-100' :
                          offer.status === 'rejected' ? 'text-red-700 bg-red-100' :
                          'text-orange-700 bg-orange-100'
                        }`}>
                          {offer.status}
                        </span>
                        
                        {/* Display Fulfilled State Badge on other bids (Fix 9) */}
                        {isRequestFulfilled && !isAccepted && (
                          <span className="text-[8px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                            ✅ Yeh request fulfill ho gayi
                          </span>
                        )}
                      </div>
                    </div>

                    {offer.alternative_model && (
                      <div className="bg-amber-50 border border-amber-100 rounded-md p-2 mt-2.5 text-xs text-amber-900 font-bold">
                        🔄 Alternative Offered: {offer.alternative_model} (₹{offer.alternative_price?.toLocaleString('en-IN')})
                      </div>
                    )}

                    {/* Winner Detail panel */}
                    {isAccepted && (
                      <div className="bg-emerald-500 text-white rounded-card p-3 mt-4 border border-emerald-600 flex flex-col gap-1.5 shadow animate-pulse">
                        <div className="text-xs font-black uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 fill-white text-emerald-600" />
                          Deal Won! Buyer Contacted
                        </div>
                        <div className="text-xs font-bold">
                          Buyer: {offer.request.buyer_name}
                        </div>
                        <div className="text-xs font-bold">
                          Phone/WA: {offer.request.buyer_phone}
                        </div>
                        <button
                          onClick={() => window.open(`https://wa.me/91${offer.request.buyer_phone}`, '_blank')}
                          className="bg-white text-emerald-600 font-extrabold text-[10px] py-1.5 rounded text-center uppercase tracking-wider hover:bg-slate-100 transition-colors"
                        >
                          Chat with Buyer on WhatsApp
                        </button>
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
            <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-2">
              Performance Metrics
            </h3>

            <div className="bg-white rounded-card border border-slate-100 p-4 shadow-sm grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Offers Quoted</span>
                <span className="text-2xl font-black text-slate-900 mt-1">{offersCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Deals Won</span>
                <span className="text-2xl font-black text-emerald-600 mt-1">{wonCount}</span>
              </div>
            </div>

            <div className="bg-white rounded-card border border-slate-100 p-4 shadow-sm grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Conversion Rate</span>
                <span className="text-2xl font-black text-slate-900 mt-1">{conversionRate}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Sales Won</span>
                <span className="text-2xl font-black text-primary mt-1">₹{totalValueWon.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quote Submission Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[390px] rounded-card shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-4 py-3.5 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase">Submit Best Price Quote</h3>
                <span className="text-[10px] font-bold text-slate-400">Budget: ₹{selectedRequest.budget.toLocaleString('en-IN')}</span>
              </div>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 bg-slate-200/50 w-5 h-5 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleQuoteSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
              {modalError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded p-3">
                  ⚠️ {modalError}
                </div>
              )}

              {/* Price field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <IndianRupee className="w-3.5 h-3.5 text-primary" />
                  Your Price Quote (GST Incl.)
                </label>
                <div className="relative rounded-input shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500 font-extrabold text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    placeholder="34,200"
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Offer Inclusions (Check all that apply)
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-card border border-slate-100">
                  {[
                    'Free Installation',
                    'Extra Warranty',
                    'Free Stabilizer',
                    '0% EMI Offer'
                  ].map((inc) => (
                    <label key={inc} className="flex items-center gap-2 cursor-pointer select-none text-[10px] font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={quoteInclusions.includes(inc)}
                        onChange={() => handleInclusionToggle(inc)}
                        className="w-3 h-3 rounded text-primary focus:ring-primary border-slate-300"
                        disabled={modalSubmitting}
                      />
                      <span>{inc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Availability selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Stock Availability
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'today', label: 'Aaj (Today) ⚡' },
                    { id: '1-2days', label: '1-2 Din' },
                    { id: '4-5days', label: '4-5 Din' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setQuoteAvailability(opt.id)}
                      className={`py-1.5 rounded-input border text-[10px] font-bold transition-all ${
                        quoteAvailability === opt.id
                          ? 'border-primary bg-primary-light/40 text-primary font-black'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                      disabled={modalSubmitting}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alternative model toggle */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={hasAltModel}
                    onChange={() => setHasAltModel(!hasAltModel)}
                    className="w-3.5 h-3.5 rounded text-primary focus:ring-primary border-slate-300"
                    disabled={modalSubmitting}
                  />
                  <span>🔄 Dusra/Alternative model offer karein?</span>
                </label>
              </div>

              {/* Alternative model fields */}
              {hasAltModel && (
                <div className="bg-slate-50 border border-slate-150 p-3 rounded-card space-y-3 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Alt Model Name (Make & Model)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Samsung Inverter 1.5T (AR18C)"
                      value={altModelName}
                      onChange={(e) => setAltModelName(e.target.value)}
                      className="input-premium py-1.5 text-xs font-semibold bg-white"
                      disabled={modalSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Alt Model Price (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="32,999"
                      value={altModelPrice}
                      onChange={(e) => setAltModelPrice(e.target.value)}
                      className="input-premium py-1.5 text-xs font-bold bg-white"
                      disabled={modalSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Alt Note/Offer (Inclusions)
                    </label>
                    <textarea
                      placeholder="e.g. Copper coil, stabilizer and installation is free!"
                      value={altModelNote}
                      onChange={(e) => setAltModelNote(e.target.value)}
                      className="input-premium py-1.5 text-xs font-semibold bg-white resize-none h-16"
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
                {modalSubmitting ? 'Offer bheja ja raha hai...' : 'Bhopal Best Price Bhejein'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
