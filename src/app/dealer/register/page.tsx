'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Store, 
  User, 
  Phone, 
  Lock, 
  MapPin, 
  CheckSquare, 
  ShieldAlert, 
  FileCheck,
  Send,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export default function DealerRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form Fields
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [area, setArea] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  // OTP Mock States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpAlert, setOtpAlert] = useState(false);

  const bhopalAreas = [
    'MP Nagar',
    'Arera Colony',
    'Kolar Road',
    'Bittan Market',
    'Shahpura',
    'New Market',
    'Habibganj',
    'Other'
  ];

  const categories = [
    { id: 'AC', label: 'Air Conditioner (AC)' },
    { id: 'TV', label: 'Smart TV' },
    { id: 'FRIDGE', label: 'Refrigerator (Fridge)' },
    { id: 'WM', label: 'Washing Machine' },
    { id: 'LAPTOP', label: 'Laptops & PCs' }
  ];

  const brands = [
    'LG',
    'Samsung',
    'Sony',
    'Panasonic',
    'Daikin',
    'Voltas',
    'Whirlpool',
    'OnePlus',
    'HP',
    'Dell',
    'Lenovo'
  ];

  const handleCategoryChange = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleBrandChange = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  // Mock sending OTP via WhatsApp
  const handleSendOTP = () => {
    const cleanPhone = whatsapp.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      setError('Kripya ek valid 10-digit WhatsApp number enter karein (Invalid number).');
      return;
    }
    setError('');
    
    // Generate a random 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpCode(code);
    setOtpSent(true);
    setOtpAlert(true); // Shows OTP on screen for developer testing

    // Automatically hide OTP alert after 10 seconds
    setTimeout(() => {
      setOtpAlert(false);
    }, 10000);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput === otpCode) {
      setOtpVerified(true);
      setOtpAlert(false);
      setError('');
    } else {
      setError('Invalid OTP code. Kripya correct 6-digit number enter karein.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!shopName || !ownerName || !whatsapp || !password || !area) {
      setError('Sabhi fields bharna compulsory hai.');
      return;
    }

    if (selectedCategories.length === 0) {
      setError('Kam se kam ek Category select karein.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/dealers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopName,
          ownerName,
          whatsapp,
          password,
          area,
          categories: selectedCategories,
          brands: selectedBrands,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error during registration');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Kripya check karein.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-16 bg-slate-50/50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-4 flex items-center gap-3">
        <Link href="/dealer" className="p-1 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div>
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">
            Register Dukaan
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            MereWalaPrice Bhopal
          </p>
        </div>
      </header>

      {/* Main Container */}
      <div className="px-5 pt-4">
        {/* OTP Mock Notification Banner */}
        {otpAlert && (
          <div className="bg-amber-500 text-white font-extrabold text-xs rounded-card p-3 mb-5 border border-amber-600 flex flex-col gap-1 shadow-lg animate-bounce">
            <span>💬 [WHATSAPP SMS SIMULATION]</span>
            <span>OTP sent to +91 {whatsapp}: <strong className="text-sm bg-white text-amber-700 px-2 py-0.5 rounded ml-1 tracking-widest">{otpCode}</strong></span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-card p-3.5 mb-5">
            ⚠️ {error}
          </div>
        )}

        {success ? (
          // Success Registration Message
          <div className="bg-white border border-slate-100 rounded-card p-6 shadow-md text-center py-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 border border-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Registration Request Sent!</h2>
            <p className="text-sm text-slate-600 font-medium mt-4 leading-relaxed max-w-xs">
              Thank you! Aapki details check karke <strong>MereWalaPrice Admin</strong> ise approve karenge.
            </p>
            <p className="text-xs text-slate-400 font-semibold mt-2 max-w-xs">
              Approval notification aapke WhatsApp number (+91 {whatsapp}) par bhej di jayegi.
            </p>

            <Link 
              href="/dealer" 
              className="btn-secondary w-full text-xs font-extrabold mt-8"
            >
              Back to Dealer Hub
            </Link>
          </div>
        ) : (
          // Registration Form
          <form onSubmit={handleRegister} className="space-y-5">
            {/* Shop Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-extrabold text-slate-800 mb-1.5 flex items-center gap-1">
                  <Store className="w-4 h-4 text-primary" />
                  Dukaan ka Naam (Shop Name)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sharma Electronics"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="input-premium font-semibold"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-800 mb-1.5 flex items-center gap-1">
                  <User className="w-4 h-4 text-primary" />
                  Owner ka Naam (Owner Name)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Sharma"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="input-premium font-semibold"
                  disabled={loading}
                />
              </div>
            </div>

            {/* WhatsApp Verification Section */}
            <div className="bg-white border border-slate-100 p-4 rounded-card shadow-sm space-y-4">
              <div>
                <label className="block text-sm font-extrabold text-slate-800 mb-1.5 flex items-center gap-1">
                  <Phone className="w-4 h-4 text-primary" />
                  WhatsApp Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={whatsapp}
                    onChange={(e) => {
                      setWhatsapp(e.target.value);
                      setOtpSent(false);
                      setOtpVerified(false);
                    }}
                    className="input-premium font-semibold flex-1"
                    disabled={loading || otpVerified}
                  />
                  {!otpVerified && (
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      className="bg-primary text-white text-xs font-bold px-3 py-3 rounded-input hover:bg-primary-hover transition-colors whitespace-nowrap"
                    >
                      {otpSent ? 'Send Again' : 'Send OTP'}
                    </button>
                  )}
                </div>
              </div>

              {otpSent && !otpVerified && (
                <div className="border-t border-slate-100 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Enter Verification OTP
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="6 digit OTP"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="input-premium font-semibold flex-1 py-1.5 text-sm"
                      maxLength={6}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOTP}
                      className="bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-input hover:bg-slate-900 transition-colors"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              )}

              {otpVerified && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded p-2.5 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  WhatsApp Number Verified!
                </div>
              )}
            </div>

            {/* Login Password */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800 mb-1.5 flex items-center gap-1">
                <Lock className="w-4 h-4 text-primary" />
                Password (Dashboard Access)
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-premium font-semibold"
                disabled={loading}
              />
            </div>

            {/* Bhopal Area Dropdown */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800 mb-1.5 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-primary" />
                Bhopal me aapka Area
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="input-premium font-semibold bg-white cursor-pointer"
                disabled={loading}
              >
                <option value="">-- Apna Area Select Karein --</option>
                {bhopalAreas.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Categories Checkboxes */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800 mb-2.5">
                Handled Categories (Select all that apply)
              </label>
              <div className="bg-white border border-slate-100 p-4 rounded-card shadow-sm space-y-3">
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.id)}
                      onChange={() => handleCategoryChange(cat.id)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
                      disabled={loading}
                    />
                    <span className="text-xs font-bold text-slate-700">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Brands Checkboxes */}
            <div>
              <label className="block text-sm font-extrabold text-slate-800 mb-2.5">
                Brands Stocked (Select all that apply)
              </label>
              <div className="bg-white border border-slate-100 p-4 rounded-card shadow-sm grid grid-cols-2 gap-3">
                {brands.map((brand) => (
                  <label key={brand} className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => handleBrandChange(brand)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
                      disabled={loading}
                    />
                    <span className="text-xs font-bold text-slate-700">{brand}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Register Action CTA */}
            <button
              type="submit"
              disabled={loading || !otpVerified}
              className="w-full btn-primary text-sm py-3.5 font-extrabold mt-6"
            >
              {loading ? 'Dukaan Register ho rahi hai...' : 'Submit Registration'}
            </button>
            
            {!otpVerified && (
              <p className="text-[10px] text-red-500 font-semibold text-center mt-1.5">
                Note: Registration ke liye WhatsApp number verify karna compulsory hai.
              </p>
            )}
          </form>
        )}
        
        <div className="text-center mt-8">
          <Link href="/dealer/dashboard" className="text-xs text-primary font-bold hover:underline">
            Already registered? Login to Dashboard ➡️
          </Link>
        </div>
      </div>
    </div>
  );
}
