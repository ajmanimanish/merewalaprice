'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import StatusBar from '@/components/StatusBar';
import BottomNav from '@/components/BottomNav';

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  model_number: string;
  image_url?: string;
}

interface BuyerRequest {
  id: string;
  product_id: string;
  budget: number;
  area: string;
  status: string;
  created_at: string;
  product?: Product;
  offers_count?: number;
}

export default function BuyerDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Stats
  const [searchesCount, setSearchesCount] = useState(12);
  const [favouritesCount, setFavouritesCount] = useState(5);

  // Lists
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [favourites, setFavourites] = useState<any[]>([]);

  // User Profile
  const [userName, setUserName] = useState('Ankit Kushwaha');
  const [userEmail, setUserEmail] = useState('ankit.k@gmail.com');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        setUserName(s.user.user_metadata?.full_name || s.user.email?.split('@')[0] || 'User');
        setUserEmail(s.user.email || '');
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setUserName(s.user.user_metadata?.full_name || s.user.email?.split('@')[0] || 'User');
        setUserEmail(s.user.email || '');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch requests & favourites
  useEffect(() => {
    async function loadData() {
      try {
        const savedPhone = localStorage.getItem('buyer_phone');
        
        let reqQuery = supabase
          .from('buyer_requests')
          .select(`
            id,
            product_id,
            budget,
            area,
            status,
            created_at,
            product:products(name, brand, model_number, category)
          `)
          .order('created_at', { ascending: false });

        if (savedPhone) {
          reqQuery = reqQuery.eq('buyer_phone', savedPhone);
        }

        const { data: reqLogs } = await reqQuery;

        if (reqLogs) {
          // Fetch offer counts for each request
          const mapped = await Promise.all(
            (reqLogs as any[]).map(async (req) => {
              const { count } = await supabase
                .from('dealer_offers')
                .select('*', { count: 'exact', head: true })
                .eq('request_id', req.id);

              return {
                id: req.id,
                product_id: req.product_id,
                budget: req.budget,
                area: req.area,
                status: req.status,
                created_at: req.created_at,
                product: req.product,
                offers_count: count || 0,
              };
            })
          );
          setRequests(mapped);
        }

        // Mock favorites list with some popular models
        const { data: favProds } = await supabase
          .from('products')
          .select('*')
          .limit(3);

        if (favProds) {
          setFavourites(favProds.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.category === 'AC' ? 35800 : p.category === 'TV' ? 42990 : 24700,
          })));
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadData();
  }, [session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('buyer_phone');
    localStorage.removeItem('buyer_name');
    router.push('/');
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
          <span className="text-[14px] font-bold text-[#6B6B6B]">Loading Account...</span>
        </div>
      </div>
    );
  }

  const initials = userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FAFAF8] md:shadow-2xl md:border-x md:border-[#EBEBEB] flex flex-col justify-between font-sans overflow-y-auto">
      <div className="flex flex-col pb-8">
        {/* Status Bar */}
        <StatusBar />

        {/* Title */}
        <div style={{ padding: '6px 20px 10px' }}>
          <span style={{ fontSize: '22px', fontWeight: 800 }}>My Account</span>
        </div>

        {/* Content */}
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Profile Card */}
          <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#F0743E', color: '#fff', fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {initials || 'AK'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>{userName}</div>
              <div style={{ fontSize: '12px', color: '#6B6B6B' }}>{userEmail}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '5px', background: '#F3ECF7', color: '#7A5CA0', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '999px' }}>
                📍 Bhopal
              </div>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#F0743E', cursor: 'pointer' }}>Edit</span>
          </div>

          {/* Stats Bar */}
          <div style={{ display: 'flex', background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ flex: 1, textAlign: 'center', padding: '14px 4px' }}>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>{searchesCount}</div>
              <div style={{ fontSize: '11px', color: '#6B6B6B', fontWeight: 600 }}>searches</div>
            </div>
            <div style={{ width: '1px', background: '#EBEBEB' }}></div>
            <div style={{ flex: 1, textAlign: 'center', padding: '14px 4px' }}>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>{requests.length}</div>
              <div style={{ fontSize: '11px', color: '#6B6B6B', fontWeight: 600 }}>requests</div>
            </div>
            <div style={{ width: '1px', background: '#EBEBEB' }}></div>
            <div style={{ flex: 1, textAlign: 'center', padding: '14px 4px' }}>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>{favouritesCount}</div>
              <div style={{ fontSize: '11px', color: '#6B6B6B', fontWeight: 600 }}>favourites</div>
            </div>
          </div>

          {/* Favourites horizontal scroll */}
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '10px' }}>My Favourites</div>
            <div className="scrollx" style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
              {favourites.map((fav) => (
                <div key={fav.id} style={{ flex: '0 0 120px', background: '#fff', border: '1px solid #EBEBEB', borderRadius: '14px', padding: '10px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                  <div style={{ height: '64px', borderRadius: '10px', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                    {getCatEmoji(fav.category)}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, marginTop: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fav.name}</div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#F0743E', marginTop: '2px' }}>₹ {fav.price.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Searches */}
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '10px' }}>Recent Searches</div>
            <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
              {favourites.slice(0, 2).map((item, idx) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderBottom: idx === 0 ? '1px solid #EBEBEB' : 'none' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                    {getCatEmoji(item.category)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#6B6B6B' }}>viewed {idx + 2} days ago</div>
                  </div>
                  <Link href={`/product/${item.id}`}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#F0743E', cursor: 'pointer' }}>→ View</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Special Requests */}
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '10px' }}>My Special Requests</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {requests.length === 0 ? (
                <div style={{ background: '#fff', border: '1px dashed #EBEBEB', borderRadius: '16px', padding: '16px', textAlign: 'center', color: '#6B6B6B', fontSize: '12px', fontWeight: 600 }}>
                  You haven't posted any special requests yet.
                </div>
              ) : (
                requests.map((r) => (
                  <div key={r.id} style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '14px', padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{r.product?.name}</span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          background: r.status === 'fulfilled' ? '#F0F0EE' : '#E7F6ED',
                          color: r.status === 'fulfilled' ? '#6B6B6B' : '#16A34A',
                          padding: '4px 9px',
                          borderRadius: '999px',
                        }}
                      >
                        {r.status === 'fulfilled' ? 'Fulfilled' : `${r.offers_count} Offers`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span style={{ fontSize: '11.5px', color: '#6B6B6B', fontWeight: 600 }}>
                        {r.status === 'fulfilled' ? 'Deal completed' : `${r.offers_count} dealers responded`}
                      </span>
                      <Link href={`/request/${r.product_id}/status`}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#F0743E', cursor: 'pointer' }}>View offers →</span>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '6px' }}>
            <span onClick={handleSignOut} style={{ fontSize: '13px', fontWeight: 700, color: '#6B6B6B', cursor: 'pointer' }}>
              Sign out
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <BottomNav active="profile" />
    </div>
  );
}
