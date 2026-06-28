'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Lock, 
  Users, 
  Inbox, 
  History, 
  Check, 
  X, 
  TrendingUp, 
  Calendar,
  AlertCircle,
  HelpCircle,
  ArrowLeft
} from 'lucide-react';

interface PendingDealer {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  whatsapp: string;
  area: string;
  categories: string[];
  brands: string[];
  created_at: string;
}

interface BuyerRequest {
  id: string;
  buyer_name: string;
  buyer_phone: string;
  budget: number;
  area: string;
  status: string;
  created_at: string;
  products?: {
    name: string;
    brand: string;
  };
}

interface DealerOffer {
  id: string;
  price: number;
  status: string;
  created_at: string;
  dealers?: {
    shop_name: string;
  };
  buyer_requests?: {
    buyer_name: string;
    products?: {
      name: string;
      brand: string;
    };
  };
}

interface Metrics {
  totalDealers: number;
  approvedDealers: number;
  pendingDealersCount: number;
  totalRequests: number;
  totalOffers: number;
  requestsByDay: Record<string, number>;
  offersByDay: Record<string, number>;
}

export default function AdminDashboard() {
  const [authorized, setAuthorized] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Dashboard Data
  const [activeTab, setActiveTab] = useState<'pending' | 'requests' | 'offers'>('pending');
  const [pendingDealers, setPendingDealers] = useState<PendingDealer[]>([]);
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [offers, setOffers] = useState<DealerOffer[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Recover authorization from session storage if present
  useEffect(() => {
    const savedPassword = sessionStorage.getItem('admin_pass');
    if (savedPassword) {
      handleVerify(savedPassword);
    }
  }, []);

  const handleVerify = async (pass: string) => {
    setAuthError('');
    setAuthLoading(true);
    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass })
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setAuthorized(true);
        sessionStorage.setItem('admin_pass', pass);
        fetchAdminData(pass);
      } else {
        setAuthError(data.error || 'Password galat hai.');
        sessionStorage.removeItem('admin_pass');
      }
    } catch (err) {
      setAuthError('Connection error. Dobara try karein.');
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchAdminData = async (pass: string) => {
    setDataLoading(true);
    try {
      const response = await fetch('/api/admin/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass })
      });
      const data = await response.json();
      
      if (response.ok) {
        setPendingDealers(data.pendingDealers);
        setRequests(data.requests);
        setOffers(data.offers);
        setMetrics(data.metrics);
      } else {
        setAuthError(data.error || 'Data load karne me error.');
      }
    } catch (err) {
      console.error('Data load exception:', err);
    } finally {
      setDataLoading(false);
    }
  };

  const handleDealerAction = async (dealerId: string, action: 'approve' | 'reject') => {
    const pass = sessionStorage.getItem('admin_pass') || '';
    if (!pass) return;

    if (action === 'reject' && !confirm('Kya aap is dealer registration ko reject aur delete karna chahte hain?')) {
      return;
    }

    setActionLoadingId(dealerId + '-' + action);
    try {
      const response = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass, dealerId, action })
      });
      
      if (response.ok) {
        // Refresh data
        fetchAdminData(pass);
      } else {
        const err = await response.json();
        alert(err.error || 'Action failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating dealer status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Locked Screen
  if (!authorized) {
    return (
      <div className="flex flex-col min-h-screen justify-center px-6 py-12 bg-slate-50/50">
        <div className="w-full bg-white border border-slate-100 p-6 rounded-card shadow-lg flex flex-col">
          <div className="text-center mb-6">
            <h1 className="font-baloo text-3xl font-extrabold text-primary">MereWalaPrice</h1>
            <p className="text-sm font-bold text-slate-800 mt-2">Admin Dashboard Lock</p>
            <p className="text-xs text-slate-400 font-semibold mt-1">Authorized admin access only.</p>
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded p-3 mb-4">
              ⚠️ {authError}
            </div>
          )}

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(passwordInput);
            }} 
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-primary" />
                Admin Password
              </label>
              <input
                type="password"
                placeholder="Enter password..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="input-premium py-2 text-sm font-semibold"
                disabled={authLoading}
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full btn-primary py-2.5 text-sm font-extrabold"
            >
              {authLoading ? 'Verifying...' : 'Unlock Dashboard'}
            </button>
          </form>

          <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 font-semibold text-center mt-6">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-5 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-sm font-extrabold text-slate-900 leading-none">Admin Console</h1>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              MereWalaPrice Bhopal
            </span>
          </div>
        </div>
        <button 
          onClick={() => {
            sessionStorage.removeItem('admin_pass');
            setAuthorized(false);
          }}
          className="text-xs text-slate-400 hover:text-red-500 font-bold flex items-center gap-1 transition-colors"
        >
          Logout
        </button>
      </header>

      {/* Metrics Banner */}
      {metrics && (
        <div className="px-5 pt-5 grid grid-cols-2 gap-3">
          <div className="bg-white p-3 rounded-card border border-slate-100 shadow-sm flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Dealers (Appr/Total)</span>
            <span className="text-base font-black text-slate-950 mt-1">{metrics.approvedDealers}/{metrics.totalDealers}</span>
          </div>
          <div className="bg-white p-3 rounded-card border border-slate-100 shadow-sm flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Buyer Requests</span>
            <span className="text-base font-black text-slate-950 mt-1">{metrics.totalRequests}</span>
          </div>
          <div className="bg-white p-3 rounded-card border border-slate-100 shadow-sm flex flex-col col-span-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Total Bids/Offers Submitted</span>
            <span className="text-base font-black text-primary mt-0.5">{metrics.totalOffers} offers total</span>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 bg-white mt-4 shadow-sm">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-3 text-center text-xs font-extrabold border-b-2 flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'pending'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Pending ({pendingDealers.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-3 text-center text-xs font-extrabold border-b-2 flex items-center justify-center gap-1 transition-colors ${
            activeTab === 'requests'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Requests ({requests.length})
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
          Offers ({offers.length})
        </button>
      </div>

      {/* Main Body */}
      <div className="p-5 flex-1">
        {dataLoading ? (
          <div className="text-center py-12 flex flex-col items-center justify-center gap-1">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs text-slate-400">Loading data...</span>
          </div>
        ) : activeTab === 'pending' ? (
          // Pending Dealers approvals
          <div className="space-y-4">
            {pendingDealers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-card border border-slate-100 p-6 flex flex-col items-center">
                <Check className="w-10 h-10 text-emerald-500 bg-emerald-50 border border-emerald-100 rounded-full p-2 mb-3" />
                <h3 className="text-sm font-extrabold text-slate-900">Sabhi Dealers Approved Hain</h3>
                <p className="text-[10px] text-slate-500 mt-1">No pending dealer approvals remaining.</p>
              </div>
            ) : (
              pendingDealers.map((dealer) => (
                <div key={dealer.id} className="card-premium space-y-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-950 leading-tight">{dealer.shop_name}</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Owner: {dealer.owner_name}</p>
                    <p className="text-xs text-slate-500 font-semibold">Location: {dealer.area} • Bhopal</p>
                    <p className="text-xs text-slate-500 font-semibold">WA: +91 {dealer.whatsapp}</p>
                  </div>

                  <div className="border-t border-slate-100 pt-2 text-[10px] font-bold text-slate-500">
                    <div>Cats: {dealer.categories.join(', ')}</div>
                    <div className="mt-1">Brands: {dealer.brands.join(', ')}</div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleDealerAction(dealer.id, 'approve')}
                      disabled={actionLoadingId !== null}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-input flex items-center justify-center gap-1 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {actionLoadingId === (dealer.id + '-approve') ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Check className="w-4.5 h-4.5" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleDealerAction(dealer.id, 'reject')}
                      disabled={actionLoadingId !== null}
                      className="flex-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold py-2 rounded-input flex items-center justify-center gap-1 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {actionLoadingId === (dealer.id + '-reject') ? (
                        <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <X className="w-4.5 h-4.5" />
                      )}
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'requests' ? (
          // Requests Logs
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 font-semibold">No buyer requests found in database.</div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="card-premium">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase">
                        {req.products?.brand} {req.products?.name}
                      </h4>
                      <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                        Buyer: {req.buyer_name}
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Budget: ₹{req.budget.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-slate-500">Area: {req.area}</p>
                    </div>

                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      req.status === 'open' ? 'text-orange-700 bg-orange-100' :
                      req.status === 'fulfilled' ? 'text-emerald-700 bg-emerald-100' :
                      'text-slate-500 bg-slate-100'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // Offers logs
          <div className="space-y-4">
            {offers.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 font-semibold">No offers submitted in database.</div>
            ) : (
              offers.map((offer) => (
                <div key={offer.id} className="card-premium">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase">
                        {offer.buyer_requests?.products?.brand} {offer.buyer_requests?.products?.name}
                      </h4>
                      <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                        Quote: ₹{offer.price.toLocaleString('en-IN')}
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Dukaan: {offer.dealers?.shop_name || 'Deleted Dealer'}</p>
                      <p className="text-[10px] text-slate-500">Buyer: {offer.buyer_requests?.buyer_name || 'Deleted Request'}</p>
                    </div>

                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      offer.status === 'accepted' ? 'text-emerald-700 bg-emerald-100' :
                      offer.status === 'rejected' ? 'text-red-700 bg-red-100' :
                      'text-orange-700 bg-orange-100'
                    }`}>
                      {offer.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
