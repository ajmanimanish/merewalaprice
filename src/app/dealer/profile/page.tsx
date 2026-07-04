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
  address?: string;
  categories: string[];
}

export default function DealerProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<DealerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // Edit states
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [categoriesSelected, setCategoriesSelected] = useState<string[]>([]);
  const [notifyPref, setNotifyPref] = useState<'all' | 'summary' | 'limit'>('all');

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (!s) router.push('/dealer');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) router.push('/dealer');
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // Load profile
  useEffect(() => {
    if (!session) return;

    async function loadProfile() {
      setLoading(true);
      try {
        const { data: dl } = await supabase
          .from('dealers')
          .select('*')
          .or(`id.eq.${session.user.id},auth_user_id.eq.${session.user.id},email.eq.${session.user.email}`)
          .single();

        if (dl) {
          setProfile(dl);
          setShopName(dl.shop_name);
          setOwnerName(dl.owner_name);
          setPhone(dl.phone);
          setWhatsapp(dl.whatsapp);
          setArea(dl.area);
          setAddress(dl.address || `${dl.area}, Bhopal 462001`);
          setCategoriesSelected(dl.categories || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/dealer');
  };

  const saveProfile = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('dealers')
        .update({
          shop_name: shopName,
          owner_name: ownerName,
          phone,
          whatsapp,
          area,
          address,
          categories: categoriesSelected,
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        shop_name: shopName,
        owner_name: ownerName,
        phone,
        whatsapp,
        area,
        address,
        categories: categoriesSelected,
      });
      setEditing(false);
      alert('Profile updated successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    if (categoriesSelected.includes(cat)) {
      setCategoriesSelected(categoriesSelected.filter((x) => x !== cat));
    } else {
      setCategoriesSelected([...categoriesSelected, cat]);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FAFAF8] md:shadow-2xl md:border-x md:border-[#EBEBEB] flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#F0743E] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-[14px] font-bold text-[#6B6B6B]">Loading Profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#FAFAF8] md:shadow-2xl md:border-x md:border-[#EBEBEB] flex flex-col justify-between font-sans overflow-y-auto pb-[76px] relative">
      <div className="flex flex-col">
        {/* Status Bar */}
        <StatusBar />

        {/* Back Link Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 20px 0' }}>
          <Link href="/dealer/dashboard">
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#F0743E', cursor: 'pointer' }}>← Back to Dashboard</span>
          </Link>
        </div>

        <div style={{ padding: '6px 20px 14px' }}>
          <div style={{ fontSize: '18px', fontWeight: 800 }}>My Profile</div>
        </div>

        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Shop Details Container */}
          <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800 }}>Shop Details</span>
              {editing ? (
                <span onClick={saveProfile} style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A', cursor: 'pointer' }}>
                  Save
                </span>
              ) : (
                <span onClick={() => setEditing(true)} style={{ fontSize: '12px', fontWeight: 700, color: '#F0743E', cursor: 'pointer' }}>
                  Edit
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {editing ? (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-[#6B6B6B] block">Shop Name</label>
                    <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#EBEBEB] rounded-lg p-2 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#6B6B6B] block">Owner Name</label>
                    <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#EBEBEB] rounded-lg p-2 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#6B6B6B] block">Phone</label>
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#EBEBEB] rounded-lg p-2 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#6B6B6B] block">WhatsApp</label>
                    <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#EBEBEB] rounded-lg p-2 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#6B6B6B] block">Area</label>
                    <input type="text" value={area} onChange={(e) => setArea(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#EBEBEB] rounded-lg p-2 text-sm mt-1" />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#6B6B6B] block">Address</label>
                    <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-[#FAFAF8] border border-[#EBEBEB] rounded-lg p-2 text-sm mt-1 h-16 resize-none" />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#6B6B6B', fontWeight: 600 }}>Shop name</span>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{profile?.shop_name}</span>
                  </div>
                  <div style={{ height: '1px', background: '#EBEBEB' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#6B6B6B', fontWeight: 600 }}>Owner name</span>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{profile?.owner_name}</span>
                  </div>
                  <div style={{ height: '1px', background: '#EBEBEB' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#6B6B6B', fontWeight: 600 }}>Phone</span>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{profile?.phone}</span>
                  </div>
                  <div style={{ height: '1px', background: '#EBEBEB' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#6B6B6B', fontWeight: 600 }}>WhatsApp</span>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{profile?.whatsapp}</span>
                  </div>
                  <div style={{ height: '1px', background: '#EBEBEB' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#6B6B6B', fontWeight: 600 }}>Area</span>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{profile?.area}</span>
                  </div>
                  <div style={{ height: '1px', background: '#EBEBEB' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                    <span style={{ fontSize: '12px', color: '#6B6B6B', fontWeight: 600, flexShrink: 0 }}>Address</span>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, textAlign: 'right' }}>{address}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Categories sell container */}
          <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>Categories I sell</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['AC', 'TV', 'WM', 'Fridge', 'Laptop'].map((cat) => {
                const isSelected = categoriesSelected.includes(cat.toUpperCase()) || (cat === 'Fridge' && categoriesSelected.includes('FRIDGE'));
                const keyName = cat === 'Fridge' ? 'FRIDGE' : cat.toUpperCase();
                return (
                  <span
                    key={cat}
                    onClick={() => editing && toggleCategory(keyName)}
                    style={{
                      fontSize: '11.5px',
                      fontWeight: isSelected ? '700' : '600',
                      background: isSelected ? '#FBF1EB' : '#FAFAF8',
                      color: isSelected ? '#F0743E' : '#6B6B6B',
                      border: isSelected ? '1px solid #F0743E' : '1px solid #EBEBEB',
                      padding: '7px 13px',
                      borderRadius: '999px',
                      cursor: editing ? 'pointer' : 'default',
                    }}
                  >
                    {cat} {isSelected ? '✓' : ''}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Working Hours */}
          <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', fontWeight: 800 }}>Working hours</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#6B6B6B' }}>9am – 8pm ✎</span>
          </div>

          {/* Notification Preference */}
          <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>Notification preference</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div onClick={() => setNotifyPref('all')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid ' + (notifyPref === 'all' ? '#F0743E' : '#D8D7D1'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {notifyPref === 'all' && <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#F0743E' }}></span>}
                </span>
                <span style={{ fontSize: '13px', fontWeight: notifyPref === 'all' ? 700 : 600, color: notifyPref === 'all' ? '#141414' : '#6B6B6B' }}>
                  Notify me for every request
                </span>
              </div>

              <div onClick={() => setNotifyPref('summary')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid ' + (notifyPref === 'summary' ? '#F0743E' : '#D8D7D1'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {notifyPref === 'summary' && <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#F0743E' }}></span>}
                </span>
                <span style={{ fontSize: '13px', fontWeight: notifyPref === 'summary' ? 700 : 600, color: notifyPref === 'summary' ? '#141414' : '#6B6B6B' }}>
                  Send daily summary only
                </span>
              </div>

              <div onClick={() => setNotifyPref('limit')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid ' + (notifyPref === 'limit' ? '#F0743E' : '#D8D7D1'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {notifyPref === 'limit' && <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#F0743E' }}></span>}
                </span>
                <span style={{ fontSize: '13px', fontWeight: notifyPref === 'limit' ? 700 : 600, color: notifyPref === 'limit' ? '#141414' : '#6B6B6B' }}>
                  Only requests above ₹30,000
                </span>
              </div>
            </div>
          </div>

          {/* Account actions */}
          <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #EBEBEB', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer' }} className="hover:bg-gray-50">
              Change password
            </div>
            <div onClick={handleSignOut} style={{ padding: '14px 16px', fontSize: '13.5px', fontWeight: 700, color: '#DC2626', cursor: 'pointer' }} className="hover:bg-gray-50">
              Sign out
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Nav Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '10px 6px 24px', background: '#fff', borderTop: '1px solid #EBEBEB', position: 'fixed', bottom: 0, left: 'calc(50% - 195px)', width: '100%', maxWidth: '390px', zIndex: 40 }}>
        <Link href="/dealer/dashboard?tab=dashboard" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <span style={{ fontSize: '17px', filter: 'grayscale(1)', opacity: .55 }}>📊</span>
            <span style={{ fontSize: '9.5px', fontWeight: 600, color: '#6B6B6B' }}>Dashboard</span>
          </div>
        </Link>
        <Link href="/dealer/prices" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <span style={{ fontSize: '17px', filter: 'grayscale(1)', opacity: .55 }}>🏷️</span>
            <span style={{ fontSize: '9.5px', fontWeight: 600, color: '#6B6B6B' }}>Prices</span>
          </div>
        </Link>
        <Link href="/dealer/dashboard?tab=requests" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <span style={{ fontSize: '17px', filter: 'grayscale(1)', opacity: .55 }}>📩</span>
            <span style={{ fontSize: '9.5px', fontWeight: 600, color: '#6B6B6B' }}>Requests</span>
          </div>
        </Link>
        <Link href="/dealer/dashboard?tab=won" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <span style={{ fontSize: '17px', filter: 'grayscale(1)', opacity: .55 }}>🏆</span>
            <span style={{ fontSize: '9.5px', fontWeight: 600, color: '#6B6B6B' }}>Won</span>
          </div>
        </Link>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <span style={{ fontSize: '17px' }}>👤</span>
          <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#F0743E' }}>Profile</span>
        </div>
      </div>
    </div>
  );
}
