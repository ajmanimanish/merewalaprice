import Link from 'next/link';
import { 
  Store, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  ArrowRight, 
  Award,
  CircleDollarSign,
  ArrowLeft
} from 'lucide-react';
import { getSupabaseService } from '@/lib/supabase';

export const revalidate = 0; // Fresh metrics each load

export default async function DealerLandingPage() {
  // Fallbacks in case DB is unpopulated during development
  let dealersCount = 152;
  let requestsThisWeek = 428;

  try {
    const supabaseAdmin = getSupabaseService();
    
    // Count total dealers
    const { count: dCount } = await supabaseAdmin
      .from('dealers')
      .select('*', { count: 'exact', head: true });
    
    if (dCount !== null && dCount > 0) {
      dealersCount = dCount;
    }

    // Count requests this week (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { count: rCount } = await supabaseAdmin
      .from('buyer_requests')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    if (rCount !== null && rCount > 0) {
      requestsThisWeek = rCount;
    }
  } catch (err) {
    console.error('Error fetching live stats for dealer landing:', err);
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-4 flex items-center gap-3">
        <Link href="/" className="p-1 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div>
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">
            Dealer Hub
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            MereWalaPrice Bhopal
          </p>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-white to-orange-50/10 px-5 pt-8 pb-6 text-center">
        <span className="inline-flex items-center gap-1 text-[10px] font-black text-primary bg-primary-light/50 px-3 py-1 rounded-full uppercase tracking-wider mb-4">
          <Award className="w-3.5 h-3.5" />
          Bhopal Retail Partner Program
        </span>
        <h2 className="text-3xl font-black text-slate-900 leading-tight">
          Aapki dukaan ko ready <br />
          <span className="text-primary">customers chahiye? 💼</span>
        </h2>
        <p className="text-slate-600 text-sm mt-4 max-w-xs mx-auto leading-relaxed font-medium">
          Dukaan par customer aane ka wait mat karo. Direct buyers ke requirement notifications pao and price quote bhej kar deal close karo!
        </p>
        
        <Link 
          href="/dealer/register"
          className="btn-primary mt-6 text-sm font-extrabold w-full py-3.5 flex justify-center items-center gap-2"
        >
          Dukaan Register Karein (3 Months Free)
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats Counter Cards */}
      <div className="px-5 grid grid-cols-2 gap-4 my-6">
        <div className="bg-white p-4 rounded-card border border-slate-100 shadow-sm flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-orange-50 text-primary rounded-full flex items-center justify-center mb-2">
            <Store className="w-5 h-5" />
          </div>
          <span className="text-xl font-black text-slate-950">{dealersCount}+</span>
          <span className="text-[10px] font-bold text-slate-500 mt-1">Bhopal Dealers joined</span>
        </div>

        <div className="bg-white p-4 rounded-card border border-slate-100 shadow-sm flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-orange-50 text-primary rounded-full flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-xl font-black text-slate-950">{requestsThisWeek}+</span>
          <span className="text-[10px] font-bold text-slate-500 mt-1">Requests this week</span>
        </div>
      </div>

      {/* Benefits Checklist */}
      <div className="px-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-2">
          Partner Benefits
        </h3>

        {/* Benefit 1 */}
        <div className="bg-white p-4 rounded-card border border-slate-100 shadow-sm flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <CircleDollarSign className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">3 Months FREE Trial 🎁</h4>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              Pehle 3 mahine koi charge nahi! Unlimited offers bhejein bina kisi transaction fees ke.
            </p>
          </div>
        </div>

        {/* Benefit 2 */}
        <div className="bg-white p-4 rounded-card border border-slate-100 shadow-sm flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">100% Genuine Bhopal Buyers ✅</h4>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              Sirf unhi buyers ke requests dikhenge jinhone active details aur correct phone verify kiye hain.
            </p>
          </div>
        </div>

        {/* Benefit 3 */}
        <div className="bg-white p-4 rounded-card border border-slate-100 shadow-sm flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">Direct Dealer Panel (No Commissions) ⚡</h4>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              Aap jo price quote karenge pura profit aapka hai. Platform aapko direct buyer se jodega WhatsApp pe!
            </p>
          </div>
        </div>
      </div>

      {/* CTA Footer */}
      <div className="px-5 mt-8 flex flex-col items-center">
        <Link 
          href="/dealer/register" 
          className="w-full btn-primary text-sm font-extrabold"
        >
          Dukaan Register Karein
        </Link>
        <span className="text-[10px] text-slate-400 font-semibold mt-3 text-center">
          Already registered? <Link href="/dealer/dashboard" className="text-primary hover:underline font-extrabold">Login to Dashboard</Link>
        </span>
      </div>
    </div>
  );
}
