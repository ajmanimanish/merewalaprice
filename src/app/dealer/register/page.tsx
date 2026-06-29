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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [area, setArea] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  // Maps / Location States
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteInputRef = React.useRef<HTMLInputElement>(null);

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

  // List of real landmarks in Bhopal for local testing suggestion fallback
  const bhopalLandmarks = [
    { name: 'Sharma Electronics, MP Nagar Zone 1, Bhopal', area: 'MP Nagar', lat: 23.2323, lng: 77.4318 },
    { name: 'Kolar Plaza, Kolar Road, Bhopal', area: 'Kolar Road', lat: 23.1772, lng: 77.4184 },
    { name: 'Arera Colony, E-7, Bhopal', area: 'Arera Colony', lat: 23.2128, lng: 77.4332 },
    { name: 'DB City Mall, Maharana Pratap Nagar, Bhopal', area: 'MP Nagar', lat: 23.2335, lng: 77.4301 },
    { name: 'New Market, TT Nagar, Bhopal', area: 'New Market', lat: 23.2425, lng: 77.3995 },
    { name: 'Bittan Market, E-5, Arera Colony, Bhopal', area: 'Bittan Market', lat: 23.2178, lng: 77.4298 },
    { name: 'Shahpura Lake Road, Shahpura, Bhopal', area: 'Shahpura', lat: 23.1994, lng: 77.4243 },
    { name: 'Habibganj Railway Station, Habibganj, Bhopal', area: 'Habibganj', lat: 23.2198, lng: 77.4389 },
    { name: 'Indrapuri Sector C, BHEL, Bhopal', area: 'Other', lat: 23.2504, lng: 77.4649 },
    { name: 'Lalghati Square, Bhopal', area: 'Other', lat: 23.2721, lng: 77.3694 },
    { name: 'Bairagarh Main Road, Bhopal', area: 'Other', lat: 23.2687, lng: 77.3242 }
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

  // Dynamically load Google Maps script if API key is present
  React.useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId)) {
      setMapsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setMapsLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  React.useEffect(() => {
    if (mapsLoaded && autocompleteInputRef.current && window.google) {
      const autocomplete = new window.google.maps.places.Autocomplete(
        autocompleteInputRef.current,
        {
          componentRestrictions: { country: 'in' },
          fields: ['address_components', 'geometry', 'formatted_address'],
          types: ['establishment', 'geocode']
        }
      );

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) return;

        const formattedAddress = place.formatted_address || '';
        setAddress(formattedAddress);
        setLatitude(place.geometry.location.lat());
        setLongitude(place.geometry.location.lng());

        // Extract sublocality or fallback area
        let foundArea = '';
        if (place.address_components) {
          for (const comp of place.address_components) {
            const types = comp.types;
            if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
              foundArea = comp.long_name;
              break;
            }
          }
        }
        
        const matchedArea = bhopalAreas.find(a => 
          a.toLowerCase() === foundArea.toLowerCase() || 
          formattedAddress.toLowerCase().includes(a.toLowerCase())
        );
        if (matchedArea) {
          setArea(matchedArea);
        } else {
          setArea('Other');
        }
      });
    }
  }, [mapsLoaded]);

  // Handle address input typing
  const handleAddressChange = (val: string) => {
    setAddress(val);
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      if (val.trim().length > 1) {
        const filtered = bhopalLandmarks.filter(item => 
          item.name.toLowerCase().includes(val.toLowerCase())
        );
        setAddressSuggestions(filtered);
        setShowSuggestions(true);
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    }
  };

  const handleSuggestionSelect = (item: any) => {
    setAddress(item.name);
    setLatitude(item.lat);
    setLongitude(item.lng);
    setArea(item.area);
    setShowSuggestions(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!shopName || !ownerName || !whatsapp || !email || !password || !area || !address) {
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
          email,
          password,
          area,
          categories: selectedCategories,
          brands: selectedBrands,
          address,
          latitude,
          longitude,
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

              <div>
                <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <User className="w-4 h-4 text-[#F0743E]" />
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="dealer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-premium"
                  disabled={loading}
                />
              </div>
            </div>

            {/* WhatsApp Details */}
            <div>
              <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Phone className="w-4 h-4 text-[#F0743E]" />
                WhatsApp Number
              </label>
              <input
                type="tel"
                placeholder="e.g. 9826123456"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="input-premium"
                disabled={loading}
              />
            </div>

            {/* Google Places Shop Address & Autocomplete */}
            <div className="relative">
              <label className="block text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-[#F0743E]" />
                Shop Address (Google Maps / Places)
              </label>
              <input
                ref={autocompleteInputRef}
                type="text"
                placeholder="Start typing your shop address or landmark..."
                value={address}
                onChange={(e) => handleAddressChange(e.target.value)}
                onFocus={() => {
                  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && address.trim().length > 1) {
                    setShowSuggestions(true);
                  }
                }}
                className="input-premium"
                disabled={loading}
                autoComplete="off"
              />
              
              {/* Mock Suggestions dropdown */}
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-[#EBEBEB] rounded-[12px] shadow-lg z-50 overflow-hidden max-h-[200px] overflow-y-auto">
                  {addressSuggestions.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handleSuggestionSelect(item)}
                      className="w-full text-left px-4 py-3 hover:bg-[#FAFAF8] text-[13px] border-b border-[#EBEBEB] last:border-0 font-medium text-[#141414]"
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Coordinates indicator */}
              {latitude && longitude && (
                <p className="text-[10px] text-[#16A34A] font-bold mt-1.5 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-ping"></span>
                  Location Verified: Lat {latitude.toFixed(4)}, Lng {longitude.toFixed(4)}
                </p>
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
              disabled={loading}
              className="w-full btn-primary mt-6"
            >
              {loading ? 'Registering Shop...' : 'Submit Registration'}
            </button>
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
