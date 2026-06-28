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
      setError('Please enter a valid 10-digit WhatsApp number.');
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
      setError('Invalid OTP code. Please enter the correct 6-digit verification code.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!shopName || !ownerName || !whatsapp || !password || !area) {
      setError('All fields are required.');
      return;
    }

    if (selectedCategories.length === 0) {
      setError('Please select at least one product category.');
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
      setError(err.message || 'Registration failed. Please check details.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-16 bg-[#FAFAF8] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white h-[60px] border-b-[0.5px] border-[#EBEBEB] px-4 flex items-center gap-3 flex-shrink-0">
        <Link href="/dealer" className="p-1 hover:bg-[#FAFAF8] rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-[#141414]" />
        </Link>
        <div>
          <h1 className="text-[16px] font-bold text-[#141414] leading-tight">
            Shop Registration
          </h1>
          <p className="text-[10px] text-[#6B6B6B] font-bold uppercase tracking-wider">
            MereWalaPrice Bhopal
          </p>
        </div>
      </header>

      {/* Main Container */}
      <div className="px-5 pt-6">
        {/* OTP Mock Notification Banner */}
        {otpAlert && (
          <div className="bg-[#FDDB48] text-[#141414] font-bold text-[12px] rounded-[12px] p-4 mb-5 border-[0.5px] border-[#EBEBEB] flex flex-col gap-1 shadow-none">
            <span>💬 [WHATSAPP SMS SIMULATION]</span>
            <span>OTP sent to +91 {whatsapp}: <strong className="text-[13px] bg-white border-[0.5px] border-[#EBEBEB] px-2 py-0.5 rounded ml-1 tracking-widest">{otpCode}</strong></span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border-[0.5px] border-red-200 text-[#DC2626] text-[13px] font-semibold rounded-[12px] p-4 mb-5">
            {error}
          </div>
        )}

        {success ? (
          // Success Registration Message
          <div className="bg-white border-[0.5px] border-[#EBEBEB] rounded-[16px] p-6 text-center py-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-green-50 text-[#16A34A] border-[0.5px] border-green-200 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-[20px] font-bold text-[#141414]">Registration Request Sent!</h2>
            <p className="text-[13px] text-[#6B6B6B] font-medium mt-4 leading-relaxed max-w-xs">
              Thank you! MereWalaPrice Admin will review and approve your registration request shortly.
            </p>
            <p className="text-[12px] text-[#A0A0A0] font-medium mt-2 max-w-xs">
              An approval notification will be sent to your WhatsApp number (+91 {whatsapp}).
            </p>

            <Link 
              href="/dealer" 
              className="btn-secondary w-full text-xs font-bold mt-8 h-[48px]"
            >
              Back to Dealer Hub
            </Link>
          </div>
        ) : (
          // Registration Form
          <form onSubmit={handleRegister} className="space-y-6">
            {/* Shop Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Store className="w-4 h-4 text-[#F0743E]" />
                  Shop Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sharma Electronics"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="input-premium"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <User className="w-4 h-4 text-[#F0743E]" />
                  Owner Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Sharma"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="input-premium"
                  disabled={loading}
                />
              </div>
            </div>

            {/* WhatsApp Verification Section */}
            <div className="bg-white border-[0.5px] border-[#EBEBEB] p-5 rounded-[16px] space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Phone className="w-4 h-4 text-[#F0743E]" />
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
                    className="input-premium flex-1"
                    disabled={loading || otpVerified}
                  />
                  {!otpVerified && (
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      className="bg-[#F0743E] hover:bg-[#D4622E] text-white text-[13px] font-bold px-4 rounded-[12px] transition-colors whitespace-nowrap active:scale-[0.97]"
                    >
                      {otpSent ? 'Send Again' : 'Send OTP'}
                    </button>
                  )}
                </div>
              </div>

              {otpSent && !otpVerified && (
                <div className="border-t border-[#EBEBEB] pt-4">
                  <label className="block text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider mb-1">
                    Enter Verification OTP
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="6 digit OTP"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="input-premium flex-1 text-sm font-bold"
                      maxLength={6}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOTP}
                      className="bg-[#141414] text-white text-[13px] font-bold px-4 rounded-[12px] hover:bg-neutral-800 transition-colors active:scale-[0.97]"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              )}

              {otpVerified && (
                <div className="bg-green-50 border-[0.5px] border-green-200 text-[#16A34A] text-[12px] font-bold rounded-[8px] p-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
                  WhatsApp Number Verified!
                </div>
              )}
            </div>

            {/* Login Password */}
            <div>
              <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Lock className="w-4 h-4 text-[#F0743E]" />
                Password (Dashboard Access)
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-premium"
                disabled={loading}
              />
            </div>

            {/* Bhopal Area Dropdown */}
            <div>
              <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-[#F0743E]" />
                Shop Area in Bhopal
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="input-premium bg-[#FAFAF8] cursor-pointer"
                disabled={loading}
              >
                <option value="">-- Select Your Area --</option>
                {bhopalAreas.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Categories Checkboxes */}
            <div>
              <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-2 flex items-center gap-1">
                Handled Categories
              </label>
              <div className="bg-white border-[0.5px] border-[#EBEBEB] p-5 rounded-[16px] space-y-3.5">
                {categories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-3 cursor-pointer select-none text-[13px] font-bold text-[#141414]">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.id)}
                      onChange={() => handleCategoryChange(cat.id)}
                      className="w-4 h-4 rounded text-[#F0743E] focus:ring-[#F0743E]/20 border-[#EBEBEB]"
                      disabled={loading}
                    />
                    <span>{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Brands Checkboxes */}
            <div>
              <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-2 flex items-center gap-1">
                Brands Stocked
              </label>
              <div className="bg-white border-[0.5px] border-[#EBEBEB] p-5 rounded-[16px] grid grid-cols-2 gap-3.5">
                {brands.map((brand) => (
                  <label key={brand} className="flex items-center gap-2.5 cursor-pointer select-none text-[13px] font-bold text-[#141414]">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => handleBrandChange(brand)}
                      className="w-4 h-4 rounded text-[#F0743E] focus:ring-[#F0743E]/20 border-[#EBEBEB]"
                      disabled={loading}
                    />
                    <span>{brand}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Register Action CTA */}
            <button
              type="submit"
              disabled={loading || !otpVerified}
              className="w-full btn-primary mt-6"
            >
              {loading ? 'Registering Shop...' : 'Submit Registration'}
            </button>
            
            {!otpVerified && (
              <p className="text-[11px] text-[#DC2626] font-bold text-center mt-2 animate-pulse">
                Note: WhatsApp verification is required to complete registration.
              </p>
            )}
          </form>
        )}
        
        <div className="text-center mt-8 pt-4 border-t border-[#EBEBEB]">
          <Link href="/dealer/dashboard" className="text-xs text-[#F0743E] font-bold hover:underline">
            Already registered? Login to Dashboard ➡️
          </Link>
        </div>
      </div>
    </div>
  );
}
