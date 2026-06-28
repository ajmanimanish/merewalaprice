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
  let dealersCount = 150;
  let requestsThisWeek = 420;

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
    <div className="flex flex-col min-h-screen bg-[#FAFAF8] pb-12 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white h-[60px] border-b-[0.5px] border-[#EBEBEB] px-4 flex items-center gap-3 flex-shrink-0">
        <Link href="/" className="p-1 hover:bg-[#FAFAF8] rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-[#141414]" />
        </Link>
        <div>
          <h1 className="text-[16px] font-bold text-[#141414] leading-tight">
            Dealer Hub
          </h1>
          <p className="text-[10px] text-[#6B6B6B] font-bold uppercase tracking-wider">
            MereWalaPrice Bhopal
          </p>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-[#FAFAF8] px-5 pt-8 pb-6 text-center flex flex-col items-center">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#F0743E] bg-[#FEF0E8] border-[0.5px] border-[#F6C3AE] px-3 py-1 rounded-full uppercase tracking-wider mb-4">
          <Award className="w-3.5 h-3.5" />
          Bhopal Retail Partner Program
        </span>
        <h2 className="text-[28px] font-bold text-[#141414] leading-tight tracking-tight">
          Want ready customers <br />
          for your shop?
        </h2>
        <p className="text-[#6B6B6B] text-[15px] mt-4 max-w-xs mx-auto leading-relaxed font-normal">
          Don't wait for walk-in customers. Get direct buyer requirements, send quotes, and close deals instantly.
        </p>
        
        <Link 
          href="/dealer/register"
          className="btn-primary mt-6 text-[15px] font-bold w-full py-3.5 flex justify-center items-center gap-2"
        >
          Register Your Shop (3 Months Free)
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats Counter Cards */}
      <div className="px-5 grid grid-cols-2 gap-4 my-6">
        <div className="bg-white p-5 rounded-[16px] border-[0.5px] border-[#EBEBEB] flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-[#FEF0E8] text-[#F0743E] rounded-full flex items-center justify-center mb-2">
            <Store className="w-5 h-5" />
          </div>
          <span className="text-[20px] font-bold text-[#141414] font-mono">{dealersCount}+</span>
          <span className="text-[11px] font-bold text-[#6B6B6B] mt-1 uppercase tracking-wider">Dealers Joined</span>
        </div>

        <div className="bg-white p-5 rounded-[16px] border-[0.5px] border-[#EBEBEB] flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-[#FEF0E8] text-[#F0743E] rounded-full flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-[20px] font-bold text-[#141414] font-mono">{requestsThisWeek}+</span>
          <span className="text-[11px] font-bold text-[#6B6B6B] mt-1 uppercase tracking-wider">Active Enquiries</span>
        </div>
      </div>

      {/* Benefits Checklist */}
      <div className="px-5 space-y-4">
        <span className="text-[12px] font-bold text-[#A0A0A0] tracking-wider uppercase block mb-2">
          Partner Benefits
        </span>

        {/* Benefit 1 */}
        <div className="bg-white p-5 rounded-[16px] border-[0.5px] border-[#EBEBEB] flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-[#FEF0E8] flex items-center justify-center text-[#F0743E] flex-shrink-0">
            <CircleDollarSign className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[15px] font-bold text-[#141414]">3 Months FREE Trial</h4>
            <p className="text-[13px] text-[#6B6B6B] mt-1 leading-relaxed">
              Completely free for the first 3 months! Send unlimited quotes without any transaction fees.
            </p>
          </div>
        </div>

        {/* Benefit 2 */}
        <div className="bg-white p-5 rounded-[16px] border-[0.5px] border-[#EBEBEB] flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-[#FEF0E8] flex items-center justify-center text-[#F0743E] flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[15px] font-bold text-[#141414]">100% Verified Local Buyers</h4>
            <p className="text-[13px] text-[#6B6B6B] mt-1 leading-relaxed">
              Only receive requests from verified local buyers with valid requirements.
            </p>
          </div>
        </div>

        {/* Benefit 3 */}
        <div className="bg-white p-5 rounded-[16px] border-[0.5px] border-[#EBEBEB] flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-[#FEF0E8] flex items-center justify-center text-[#F0743E] flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[15px] font-bold text-[#141414]">No Middleman Commissions</h4>
            <p className="text-[13px] text-[#6B6B6B] mt-1 leading-relaxed">
              Keep 100% of your profits. The platform connects you directly with the buyer via WhatsApp.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Footer */}
      <div className="px-5 mt-8 flex flex-col items-center">
        <Link 
          href="/dealer/register" 
          className="w-full btn-primary"
        >
          Register Your Shop
        </Link>
        <span className="text-[12px] text-[#6B6B6B] font-semibold mt-3 text-center">
          Already registered? <Link href="/dealer/dashboard" className="text-[#F0743E] hover:underline font-bold">Login to Dashboard</Link>
        </span>
      </div>
    </div>
  );
}
