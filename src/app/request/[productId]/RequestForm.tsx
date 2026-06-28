'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  ShoppingBag, 
  Phone, 
  User, 
  IndianRupee, 
  Zap,
  HelpCircle
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  model_number: string;
  image_url?: string;
}

interface RequestFormProps {
  product: Product;
}

export default function RequestForm({ product }: RequestFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form fields state
  const [budget, setBudget] = useState('');
  const [area, setArea] = useState('');
  const [urgency, setUrgency] = useState('today');
  const [purchaseType, setPurchaseType] = useState('personal');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');

  // Inline Validation Errors (Fix 8)
  const [budgetError, setBudgetError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [nameError, setNameError] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setError('');
    setBudgetError('');
    setPhoneError('');
    setNameError('');

    let isValid = true;

    // 1. Budget validation: ₹5,000 to ₹5,00,000 (Fix 8)
    const numBudget = parseInt(budget, 10);
    if (isNaN(numBudget) || numBudget < 5000 || numBudget > 500000) {
      setBudgetError('Valid budget daalen (₹5,000 se ₹5,00,000 ke beech)');
      isValid = false;
    }

    // 2. Phone validation: exactly 10 digits, starts with 6,7,8,9 (Fix 8)
    const cleanPhone = buyerPhone.replace(/[^0-9]/g, '');
    const startsWithValidDigit = /^[6-9]/.test(cleanPhone);
    if (cleanPhone.length !== 10 || !startsWithValidDigit) {
      setPhoneError('Valid Indian mobile number daalen');
      isValid = false;
    }

    // 3. Name validation: min 2 chars, no numbers (Fix 8)
    const hasNumbers = /\d/.test(buyerName);
    if (buyerName.trim().length < 2 || hasNumbers) {
      setNameError('Apna naam daalen');
      isValid = false;
    }

    // 4. Area validation
    if (!area) {
      setError('Kripya apna Area select karein.');
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          buyerName,
          buyerPhone: cleanPhone,
          budget: numBudget,
          area,
          urgency,
          purchaseType,
          quantity: 1
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error occurred');
      }

      // Successful creation, redirect to results page
      router.push(`/results/${data.requestId}?token=${data.accessToken}`);
    } catch (err: any) {
      setError(err.message || 'Kuch error aayi, kripya dobara koshish karein.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-12 bg-slate-50/50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-4 flex items-center gap-3">
        <Link href="/" className="p-1 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div>
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">
            Best Deal Request
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Bhopal Local Sellers
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-5 pt-4">
        {/* Selected Product Card */}
        <div className="bg-white border border-slate-100 rounded-card p-4 shadow-sm flex gap-4 items-center mb-6">
          <div className="w-20 h-20 bg-slate-50 rounded-lg overflow-hidden border border-slate-200/60 flex-shrink-0 flex items-center justify-center">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <HelpCircle className="w-8 h-8 text-slate-300" />
            )}
          </div>
          <div className="min-w-0">
            <span className="inline-block text-[10px] font-extrabold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider mb-1">
              {product.brand}
            </span>
            <h2 className="text-base font-extrabold text-slate-900 truncate leading-tight">
              {product.name}
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Model: <span className="text-slate-800 font-bold">{product.model_number}</span>
            </p>
          </div>
        </div>

        {/* General Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-card p-3.5 mb-5 animate-in fade-in slide-in-from-top-1 duration-200">
            ⚠️ {error}
          </div>
        )}

        {/* Request Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Budget Input */}
          <div>
            <label className="block text-sm font-extrabold text-slate-800 mb-1.5 flex items-center gap-1">
              <IndianRupee className="w-4 h-4 text-primary" />
              Aapka Budget (Expected Price)
            </label>
            <div className="relative rounded-input shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <span className="text-slate-500 font-extrabold text-lg">₹</span>
              </div>
              <input
                type="number"
                placeholder="15,000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className={`input-premium pl-8 font-bold text-lg ${budgetError ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''}`}
                min="1"
                disabled={loading}
              />
            </div>
            {budgetError && (
              <p className="text-red-500 text-xs font-bold mt-1 animate-in fade-in duration-200">
                ❌ {budgetError}
              </p>
            )}
            <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
              Note: Iss price ke aas-paas dealers offers bhejenge.
            </p>
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

          {/* Urgency Radio Selection */}
          <div>
            <label className="block text-sm font-extrabold text-slate-800 mb-2 flex items-center gap-1">
              <Clock className="w-4 h-4 text-primary" />
              Khareedne ki jaldi (Urgency)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'today', label: 'Aaj hi 🔥', sub: 'Today' },
                { id: 'this_week', label: 'Is hafte', sub: '1-2 Days' },
                { id: 'exploring', label: 'Sirf Price', sub: 'Check' }
              ].map((urg) => (
                <label
                  key={urg.id}
                  className={`flex flex-col items-center justify-center p-3 border rounded-card cursor-pointer transition-all duration-200 ${
                    urgency === urg.id
                      ? 'border-primary bg-primary-light/40 text-primary font-bold shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="urgency"
                    value={urg.id}
                    checked={urgency === urg.id}
                    onChange={() => setUrgency(urg.id)}
                    className="sr-only"
                    disabled={loading}
                  />
                  <span className="text-xs font-extrabold leading-none">{urg.label}</span>
                  <span className="text-[9px] text-slate-400 font-semibold mt-1">{urg.sub}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Purchase Type Radio Selection */}
          <div>
            <label className="block text-sm font-extrabold text-slate-800 mb-2 flex items-center gap-1">
              <ShoppingBag className="w-4 h-4 text-primary" />
              Kiske liye chahiye? (Purchase Type)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'personal', label: 'Ghar liye 🏠', sub: 'Personal' },
                { id: 'business', label: 'Dukaan resale', sub: 'Resale' },
                { id: 'bulk', label: 'Bulk 3+', sub: '3+ Units' }
              ].map((type) => (
                <label
                  key={type.id}
                  className={`flex flex-col items-center justify-center p-3 border rounded-card cursor-pointer transition-all duration-200 ${
                    purchaseType === type.id
                      ? 'border-primary bg-primary-light/40 text-primary font-bold shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="purchaseType"
                    value={type.id}
                    checked={purchaseType === type.id}
                    onChange={() => setPurchaseType(type.id)}
                    className="sr-only"
                    disabled={loading}
                  />
                  <span className="text-xs font-extrabold leading-none">{type.label}</span>
                  <span className="text-[9px] text-slate-400 font-semibold mt-1">{type.sub}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-200 my-2"></div>

          {/* Buyer Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-extrabold text-slate-800 mb-1.5 flex items-center gap-1">
                <User className="w-4 h-4 text-primary" />
                Aapka Naam
              </label>
              <input
                type="text"
                placeholder="Ramesh Sharma"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className={`input-premium font-semibold ${nameError ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''}`}
                disabled={loading}
              />
              {nameError && (
                <p className="text-red-500 text-xs font-bold mt-1 animate-in fade-in duration-200">
                  ❌ {nameError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-extrabold text-slate-800 mb-1.5 flex items-center gap-1">
                <Phone className="w-4 h-4 text-primary" />
                WhatsApp Number (Deals results paane ke liye)
              </label>
              <input
                type="tel"
                placeholder="98765 43210"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                className={`input-premium font-semibold ${phoneError ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''}`}
                disabled={loading}
              />
              {phoneError && (
                <p className="text-red-500 text-xs font-bold mt-1 animate-in fade-in duration-200">
                  ❌ {phoneError}
                </p>
              )}
              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                Note: Offers results link directly WhatsApp pe send kiya jayega.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full btn-primary mt-6 text-base"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Best Deal Request...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 fill-white text-white" />
                Best Deal Request Bhejein
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
