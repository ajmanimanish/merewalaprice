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

  // Inline Validation Errors
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

    // 1. Budget validation: ₹5,00,000 max, ₹5,000 min
    const numBudget = parseInt(budget, 10);
    if (isNaN(numBudget) || numBudget < 5000 || numBudget > 500000) {
      setBudgetError('Enter a valid budget between ₹5,000 and ₹5,00,000');
      isValid = false;
    }

    // 2. Phone validation: exactly 10 digits starting with 6-9
    const cleanPhone = buyerPhone.replace(/[^0-9]/g, '');
    const startsWithValidDigit = /^[6-9]/.test(cleanPhone);
    if (cleanPhone.length !== 10 || !startsWithValidDigit) {
      setPhoneError('Enter a valid 10-digit Indian mobile number');
      isValid = false;
    }

    // 3. Name validation: minimum 2 chars, no numbers
    const hasNumbers = /\d/.test(buyerName);
    if (buyerName.trim().length < 2 || hasNumbers) {
      setNameError('Enter your name (minimum 2 letters, no numbers)');
      isValid = false;
    }

    // 4. Area validation
    if (!area) {
      setError('Please select your area in Bhopal');
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
      setError(err.message || 'Connection failed, please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-12 bg-[#FAFAF8] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white h-[60px] border-b-[0.5px] border-[#EBEBEB] px-4 flex items-center gap-3 flex-shrink-0">
        <Link href="/" className="p-1 hover:bg-[#FAFAF8] rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-[#141414]" />
        </Link>
        <div>
          <h1 className="text-[16px] font-bold text-[#141414] leading-tight">
            Find Best Price
          </h1>
          <p className="text-[10px] font-medium text-[#6B6B6B] uppercase tracking-wider">
            Local Sellers Request
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-5 pt-6 flex-1 flex flex-col gap-6">
        {/* Selected Product Card */}
        <div className="bg-white border-[0.5px] border-[#EBEBEB] rounded-[16px] p-5 flex gap-4 items-center">
          <div className="w-20 h-20 bg-[#FAFAF8] rounded-[12px] overflow-hidden border-[0.5px] border-[#EBEBEB] flex-shrink-0 flex items-center justify-center">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <HelpCircle className="w-8 h-8 text-slate-300" />
            )}
          </div>
          <div className="min-w-0">
            <span className="inline-block text-[10px] font-bold bg-[#FEF0E8] text-[#F0743E] px-2 py-0.5 rounded-[4px] uppercase tracking-wider mb-1">
              {product.brand}
            </span>
            <h2 className="text-[16px] font-bold text-[#141414] truncate leading-tight">
              {product.name}
            </h2>
            <p className="text-[12px] text-[#6B6B6B] font-medium mt-1">
              Model: <span className="text-[#141414] font-bold">{product.model_number}</span>
            </p>
          </div>
        </div>

        {/* General Error Alert */}
        {error && (
          <div className="bg-red-50 border-[0.5px] border-red-200 text-[#DC2626] text-[13px] font-semibold rounded-[12px] p-4">
            {error}
          </div>
        )}

        {/* Request Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Budget Input */}
          <div>
            <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5 text-[#F0743E]" />
              Your Budget (Expected Price)
            </label>
            <div className="relative rounded-[12px]">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <span className="text-[#6B6B6B] font-bold text-[16px]">₹</span>
              </div>
              <input
                type="number"
                placeholder="15000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className={`input-premium pl-8 font-bold text-lg ${budgetError ? 'border-[#DC2626] focus:border-[#DC2626]' : ''}`}
                min="1"
                disabled={loading}
              />
            </div>
            {budgetError && (
              <p className="text-[#DC2626] text-[12px] font-bold mt-1">
                {budgetError}
              </p>
            )}
            <p className="text-[10px] text-[#A0A0A0] font-medium mt-1.5">
              Note: Bhopal dealers will offer quotes close to this price.
            </p>
          </div>

          {/* Area Dropdown */}
          <div>
            <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#F0743E]" />
              Your Area in Bhopal
            </label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="input-premium font-semibold bg-[#FAFAF8] cursor-pointer"
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

          {/* Urgency Pill-Style Selector (Fix 8 urgency styling) */}
          <div>
            <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#F0743E]" />
              Purchase Urgency
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'today', label: 'Need Today' },
                { id: 'this_week', label: 'This Week' },
                { id: 'exploring', label: 'Price Check' }
              ].map((urg) => {
                const isActive = urgency === urg.id;
                return (
                  <button
                    key={urg.id}
                    type="button"
                    onClick={() => setUrgency(urg.id)}
                    className={`pill-selector ${isActive ? 'pill-selector-active' : ''}`}
                    disabled={loading}
                  >
                    {urg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Purchase Type Pill-Style Selector (Fix 8 type styling) */}
          <div>
            <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-2 flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5 text-[#F0743E]" />
              Purchase Intent
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'personal', label: 'For Home' },
                { id: 'business', label: 'For Resale' },
                { id: 'bulk', label: 'Bulk Purchase (3+)' }
              ].map((type) => {
                const isActive = purchaseType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setPurchaseType(type.id)}
                    className={`pill-selector ${isActive ? 'pill-selector-active' : ''}`}
                    disabled={loading}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="h-[0.5px] bg-[#EBEBEB] my-4"></div>

          {/* Buyer Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#F0743E]" />
                Your Full Name
              </label>
              <input
                type="text"
                placeholder="Ramesh Sharma"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className={`input-premium ${nameError ? 'border-[#DC2626] focus:border-[#DC2626]' : ''}`}
                disabled={loading}
              />
              {nameError && (
                <p className="text-[#DC2626] text-[12px] font-bold mt-1">
                  {nameError}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-[#F0743E]" />
                WhatsApp Mobile Number
              </label>
              <input
                type="tel"
                placeholder="9826123456"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                className={`input-premium ${phoneError ? 'border-[#DC2626] focus:border-[#DC2626]' : ''}`}
                disabled={loading}
              />
              {phoneError && (
                <p className="text-[#DC2626] text-[12px] font-bold mt-1">
                  {phoneError}
                </p>
              )}
              <p className="text-[10px] text-[#A0A0A0] font-medium mt-1.5">
                Note: Results URL will be sent directly via WhatsApp.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full btn-primary mt-8"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Finding best prices...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 fill-white text-white" />
                Request Quotes
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
