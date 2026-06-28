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
  TrendingDown, 
  Zap, 
  CheckCircle2, 
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { searchProducts, SearchProduct } from '@/lib/typesense';

// Inline washing machine fallback in case lucide icon loading issues occur
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
  const [suggestions, setSuggestions] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Categories list
  const categories = [
    { id: 'AC', name: 'कूलर & AC', hindi: 'एयर कंडीशनर', icon: Wind, color: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100/70' },
    { id: 'TV', name: 'स्मार्ट टीवी', hindi: 'टेलीविज़न', icon: Tv, color: 'bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100/70' },
    { id: 'FRIDGE', name: 'फ्रिज / Fridge', hindi: 'रेफ्रिजरेटर', icon: Snowflake, color: 'bg-cyan-50 text-cyan-600 border-cyan-100 hover:bg-cyan-100/70' },
    { id: 'WM', name: 'वाशिंग मशीन', hindi: 'कपड़े धोने की मशीन', icon: WashingMachineIcon, color: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100/70' },
    { id: 'LAPTOP', name: 'लैपटॉप', hindi: 'कंप्यूटर', icon: Laptop, color: 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100/70' }
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

  const handleCategoryClick = (categoryId: string) => {
    setQuery(categoryId);
    setShowDropdown(true);
  };

  return (
    <div className="flex flex-col min-h-screen pb-16 bg-slate-50/50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-5 py-4 flex flex-col items-center">
        <h1 className="font-baloo text-3xl font-extrabold text-primary tracking-tight leading-none">
          MereWalaPrice
        </h1>
        <p className="text-xs text-slate-500 font-medium tracking-wide mt-1.5 uppercase">
          Bhopal ka sabse sahi price 📍
        </p>
      </header>

      {/* Hero / Search Section */}
      <div className="bg-gradient-to-b from-white to-slate-50/20 px-5 pt-8 pb-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">
            Online से भी सस्ता खरीदें,<br />
            <span className="text-primary bg-primary-light/50 px-2 py-0.5 rounded-md inline-block mt-1">
              भोपाल के लोकल डीलर्स से!
            </span>
          </h2>
          <p className="text-slate-600 text-sm mt-3 font-medium">
            Post your requirement & let local shopkeepers bid.
          </p>
        </div>

        {/* Search bar container */}
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <input
              type="text"
              placeholder="Search AC, Smart TV, Fridge, Laptop..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="input-premium pl-11 pr-10 font-medium shadow-md shadow-slate-100"
            />
            <Search className="absolute left-3.5 top-3.5 text-slate-400 w-5 h-5" />
            
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-3.5 text-xs text-slate-400 font-semibold hover:text-slate-600 bg-slate-100 rounded-full w-5 h-5 flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>

          {/* Typeahead Suggestions Dropdown */}
          {showDropdown && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-card border border-slate-100 shadow-2xl z-50 overflow-hidden max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
              {loading ? (
                <div className="p-4 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  Searching models...
                </div>
              ) : suggestions.length > 0 ? (
                <div>
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                      {query ? 'Suggested Models' : 'Popular Models'}
                    </span>
                  </div>
                  {suggestions.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product.id)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-b-0 flex items-start gap-3 transition-colors duration-150"
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <HelpCircle className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate leading-tight">
                          {product.brand} {product.name}
                        </div>
                        <div className="text-xs text-slate-500 font-semibold mt-0.5">
                          Model: {product.model_number} • <span className="text-primary font-bold">{product.category}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 mt-2 self-center flex-shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-slate-500 font-medium">Koi matching product nahi mila 😞</p>
                  <p className="text-xs text-slate-400 mt-1">Kuch aur search karke dekhein or contact admin.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category Tiles */}
      <div className="px-5 py-4">
        <h3 className="text-sm font-bold text-slate-400 tracking-wider uppercase mb-3">
          Categories
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={`flex flex-col items-center justify-center p-4 border rounded-card transition-all duration-200 text-center group active:scale-[0.98] ${cat.color}`}
              >
                <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform duration-200">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-slate-800 mt-3 leading-none">
                  {cat.name}
                </span>
                <span className="text-[10px] font-medium text-slate-500 mt-1">
                  {cat.hindi}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* How it Works Section */}
      <div className="px-5 py-6 bg-white border-y border-slate-100 mt-4">
        <h3 className="text-center text-lg font-extrabold text-slate-900 mb-6">
          MereWalaPrice कैसे काम करता है? 🤔
        </h3>
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-primary font-extrabold text-sm flex-shrink-0 shadow-sm">
              1
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">मॉडल सेलेक्ट करें 🔍</h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                ऊपर सर्च बार से अपना मनपसंद इलेक्ट्रॉनिक मॉडल सर्च करें और सेलेक्ट करें।
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-primary font-extrabold text-sm flex-shrink-0 shadow-sm">
              2
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">बजट और एरिया डालें 📝</h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                अपना बजट, भोपाल का एरिया (जैसे MP Nagar, Kolar) और कांटेक्ट डिटेल्स भरें।
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-primary font-extrabold text-sm flex-shrink-0 shadow-sm">
              3
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">लोकल बेस्ट डील पाएँ ⚡</h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                भोपाल के लोकल डीलर्स आपको सीधे WhatsApp पर ऑफर भेजेंगे। ऑनलाइन से कम दाम की गारंटी!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof Stats Counter */}
      <div className="px-5 py-8 bg-slate-900 text-white text-center rounded-b-3xl">
        <h3 className="text-xs font-bold text-primary tracking-widest uppercase mb-6">
          MereWalaPrice Bhopal Network
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-800/80 p-3 rounded-card border border-slate-700/50">
            <div className="text-xl font-black text-white">150+</div>
            <div className="text-[10px] font-bold text-slate-400 mt-1">Verified Dealers</div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-card border border-slate-700/50">
            <div className="text-xl font-black text-white">3,200+</div>
            <div className="text-[10px] font-bold text-slate-400 mt-1">Requests Sent</div>
          </div>
          <div className="bg-slate-800/80 p-3 rounded-card border border-slate-700/50">
            <div className="text-xl font-black text-primary">₹25L+</div>
            <div className="text-[10px] font-bold text-slate-400 mt-1">Bhopal Savings</div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col items-center">
          <p className="text-xs text-slate-400 font-semibold">
            Are you a shop owner in Bhopal?
          </p>
          <Link 
            href="/dealer"
            className="mt-3 flex items-center gap-1.5 text-xs text-primary font-extrabold hover:underline"
          >
            <Store className="w-4 h-4" />
            Dukaan Register karein
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
