'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Wind, 
  Tv, 
  Snowflake, 
  Laptop, 
  Store, 
  HelpCircle, 
  ChevronRight,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { searchProducts, SearchProduct } from '@/lib/typesense';
import { supabase } from '@/lib/supabase';

// Inline washing machine SVG icon
const WashingMachineIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 6h18v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M3 10h18" />
    <circle cx="12" cy="15" r="4" />
    <circle cx="12" cy="15" r="1" />
    <circle cx="6" cy="8" r="1" />
    <circle cx="9" cy="8" r="1" />
  </svg>
);

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [suggestions, setSuggestions] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Categories list
  const categories = [
    { id: 'AC', name: 'Air Conditioner', icon: Wind, iconBg: '#CDBCDB' },
    { id: 'TV', name: 'Smart TV', icon: Tv, iconBg: '#FDDB48' },
    { id: 'FRIDGE', name: 'Refrigerator', icon: Snowflake, iconBg: '#9AB2D4' },
    { id: 'WM', name: 'Washing Machine', icon: WashingMachineIcon, iconBg: '#F6C3AE' },
    { id: 'LAPTOP', name: 'Laptop', icon: Laptop, iconBg: '#AAD59E' }
  ];

  // Perform search on query change
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (query.trim().length > 0) {
        setLoading(true);
        try {
          const results = await searchProducts(query);
          setSuggestions(results);
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      } else {
        // If empty, show recent/featured items
        try {
          const defaultProducts = await searchProducts('');
          setSuggestions(defaultProducts.slice(0, 5));
        } catch (error) {
          console.error(error);
        }
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProductSelect = (productId: string) => {
    router.push(`/request/${productId}`);
  };

  const handleCategoryClick = async (categoryId: string) => {
    setShowDropdown(true);
    setLoading(true);
    setSelectedCategory(categoryId);
    try {
      // Search by category using Supabase directly
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data } = await supabaseClient
        .from('products')
        .select('*')
        .eq('category', categoryId)
        .eq('is_active', true)
        .limit(10);
      setSuggestions(data || []);
      setQuery(''); // Clear query so search bar shows placeholder
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-16 bg-[#FAFAF8] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white h-[60px] border-b-[0.5px] border-[#EBEBEB] px-5 flex items-center justify-between flex-shrink-0">
        <Link href="/" className="flex items-center gap-1">
          <span className="text-[20px] font-semibold text-[#141414] tracking-tight">MereWala</span>
          <span className="text-[20px] font-bold text-[#F0743E] tracking-tight">Price</span>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              {/* User avatar circle */}
              <div className="w-8 h-8 rounded-full bg-[#F0743E] flex items-center justify-center text-white text-[13px] font-bold">
                {user.user_metadata?.full_name?.[0]?.toUpperCase() || 
                 user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setUser(null);
                }}
                className="text-[11px] font-semibold text-[#6B6B6B] hover:text-[#DC2626] transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link 
              href="/auth" 
              className="text-[12px] font-bold text-[#F0743E] border border-[#F0743E] rounded-full px-3 py-1 hover:bg-[#FEF0E8] transition-colors"
            >
              Sign in
            </Link>
          )}
          <Link href="/dealer" className="text-xs font-bold text-[#6B6B6B] hover:text-[#F0743E] flex items-center gap-1 transition-colors">
            <Store className="w-3.5 h-3.5" />
            For Dealers
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-[#F0743E] px-5 pt-8 pb-14 flex-shrink-0">
        <h2 className="text-[26px] font-bold text-white leading-tight tracking-tight max-w-[280px]">
          Better price than online. From your city.
        </h2>
        <p className="text-white/85 text-[15px] font-normal mt-2 leading-relaxed max-w-[280px]">
          Local dealers compete for your business.
        </p>
      </div>

      {/* Floating Search Bar Overlapping Hero */}
      <div className="px-5 -mt-6 relative z-20 flex-shrink-0" ref={dropdownRef}>
        <div className="relative bg-white border-[0.5px] border-[#EBEBEB] rounded-[16px] h-14 flex items-center px-4">
          <Search className="text-[#A0A0A0] w-5 h-5 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search AC, TV, Washing Machine..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedCategory('');
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className="w-full h-full pl-3 bg-transparent outline-none border-none text-[15px] text-[#141414] placeholder-[#C0C0C0] font-normal focus:ring-0"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="text-xs text-[#A0A0A0] font-semibold hover:text-[#6B6B6B] bg-[#FAFAF8] border-[0.5px] border-[#EBEBEB] rounded-full w-5 h-5 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Typeahead Suggestions Dropdown */}
        {showDropdown && (
          <div className="absolute left-5 right-5 mt-2 bg-white rounded-[16px] border-[0.5px] border-[#EBEBEB] z-50 overflow-hidden max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="p-5 text-center text-[14px] text-[#6B6B6B] flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-[#F0743E] border-t-transparent rounded-full animate-spin"></div>
                Searching models...
              </div>
            ) : suggestions.length > 0 ? (
              <div>
                <div className="bg-[#FAFAF8] px-4 py-2 border-b-[0.5px] border-[#EBEBEB]">
                  <span className="text-[10px] font-bold text-[#A0A0A0] tracking-wider uppercase">
                    {query ? 'Suggested Models' : 'Popular Models'}
                  </span>
                </div>
                {suggestions.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductSelect(product.id)}
                    className="w-full text-left px-4 py-3.5 hover:bg-[#FAFAF8] active:bg-[#F8F8F6] border-b-[0.5px] border-[#EBEBEB] last:border-b-0 flex items-start gap-3 transition-colors duration-150"
                  >
                    <div className="w-10 h-10 rounded-[8px] bg-[#FAFAF8] border-[0.5px] border-[#EBEBEB] flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <HelpCircle className="w-5 h-5 text-[#A0A0A0]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold text-[#141414] truncate leading-tight">
                        {product.brand} {product.name}
                      </div>
                      <div className="text-[11px] text-[#6B6B6B] font-medium mt-0.5">
                        Model: {product.model_number} • <span className="text-[#F0743E] font-bold">{product.category}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#A0A0A0] mt-2 self-center flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-white">
                <p className="text-[14px] text-[#6B6B6B] font-medium">No matching product found</p>
                <p className="text-[12px] text-[#A0A0A0] mt-1">Please try searching for another model.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category Horizontal scroll row */}
      <div className="py-6 flex flex-col gap-3">
        <div className="px-5">
          <span className="text-[12px] font-bold text-[#6B6B6B] tracking-wider uppercase">
            Browse Categories
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none px-5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`flex-shrink-0 w-20 h-22 bg-white border-[0.5px] rounded-[16px] flex flex-col items-center justify-between overflow-hidden transition-all duration-150 active:bg-[#F8F8F6] ${
                  isSelected ? 'border-[#F0743E] bg-[#FEF0E8]' : 'border-[#EBEBEB]'
                }`}
              >
                <div 
                  className="w-full h-14 flex items-center justify-center transition-colors"
                  style={{ backgroundColor: cat.iconBg }}
                >
                  <Icon className="w-5 h-5 text-[#141414]" />
                </div>
                <div className="h-8 flex items-center justify-center text-center px-1">
                  <span className="text-[10px] font-bold text-[#141414] leading-tight">
                    {cat.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* How it Works Section */}
      <div className="px-5 py-6 bg-white border-y-[0.5px] border-[#EBEBEB] flex flex-col gap-6">
        <h3 className="text-center text-[20px] font-bold text-[#141414]">
          How MereWalaPrice Works
        </h3>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-[#FEF0E8] flex items-center justify-center text-[#F0743E] font-bold text-[14px] flex-shrink-0">
              1
            </div>
            <div>
              <h4 className="text-[15px] font-bold text-[#141414]">Select Model</h4>
              <p className="text-[13px] text-[#6B6B6B] mt-1 leading-relaxed">
                Search and select your desired electronic model from the catalog.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-[#FEF0E8] flex items-center justify-center text-[#F0743E] font-bold text-[14px] flex-shrink-0">
              2
            </div>
            <div>
              <h4 className="text-[15px] font-bold text-[#141414]">Enter Details</h4>
              <p className="text-[13px] text-[#6B6B6B] mt-1 leading-relaxed">
                Provide your expected budget, area in Bhopal, and contact details.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-[#FEF0E8] flex items-center justify-center text-[#F0743E] font-bold text-[14px] flex-shrink-0">
              3
            </div>
            <div>
              <h4 className="text-[15px] font-bold text-[#141414]">Get Best Local Price</h4>
              <p className="text-[13px] text-[#6B6B6B] mt-1 leading-relaxed">
                Approved local dealers bid to win your business. Direct chat via WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Network Stats Block */}
      <div className="px-5 py-8 bg-[#141414] text-white text-center rounded-b-[24px]">
        <span className="text-[12px] font-bold text-[#F0743E] tracking-widest uppercase block mb-6">
          MereWalaPrice Bhopal Network
        </span>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1A1A1A] p-4 rounded-[12px] border-[0.5px] border-neutral-800">
            <div className="text-[20px] font-bold text-white">150+</div>
            <div className="text-[10px] font-medium text-[#A0A0A0] mt-1 uppercase tracking-wide">Dealers</div>
          </div>
          <div className="bg-[#1A1A1A] p-4 rounded-[12px] border-[0.5px] border-neutral-800">
            <div className="text-[20px] font-bold text-white">3.2k+</div>
            <div className="text-[10px] font-medium text-[#A0A0A0] mt-1 uppercase tracking-wide">Requests</div>
          </div>
          <div className="bg-[#1A1A1A] p-4 rounded-[12px] border-[0.5px] border-neutral-800">
            <div className="text-[20px] font-bold text-[#F0743E]">₹25L+</div>
            <div className="text-[10px] font-medium text-[#A0A0A0] mt-1 uppercase tracking-wide">Savings</div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-neutral-800 flex flex-col items-center">
          <p className="text-[13px] text-[#A0A0A0] font-normal">
            Are you a shop owner in Bhopal?
          </p>
          <Link 
            href="/dealer"
            className="mt-3 flex items-center gap-1 text-[13px] text-[#F0743E] font-bold hover:underline transition-all active:scale-[0.98]"
          >
            Register your shop
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
