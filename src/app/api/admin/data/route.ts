import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    const adminPassword = process.env.ADMIN_PASSWORD || 'bhopalprice123';

    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseService();

    // 1. Fetch pending dealers
    const { data: pendingDealers, error: pdError } = await supabaseAdmin
      .from('dealers')
      .select('*')
      .eq('is_approved', false)
      .order('created_at', { ascending: false });

    if (pdError) throw pdError;

    // 2. Fetch all buyer requests (with product detail join)
    const { data: requests, error: rError } = await supabaseAdmin
      .from('buyer_requests')
      .select('*, products(*)')
      .order('created_at', { ascending: false });

    if (rError) throw rError;

    // 3. Fetch all dealer offers
    const { data: offers, error: oError } = await supabaseAdmin
      .from('dealer_offers')
      .select('*, dealers(*), buyer_requests(buyer_name, products(name, brand))')
      .order('created_at', { ascending: false });

    if (oError) throw oError;

    // 4. Calculate simple metrics
    const totalDealersCount = (
      await supabaseAdmin.from('dealers').select('*', { count: 'exact', head: true })
    ).count || 0;
    
    const approvedDealersCount = totalDealersCount - (pendingDealers?.length || 0);

    // Calculate requests/day and offers/day for the last 7 days
    const reqsByDay: Record<string, number> = {};
    const offersByDay: Record<string, number> = {};

    // Helper to format date as YYYY-MM-DD
    const formatDate = (isoString: string) => isoString.split('T')[0];

    (requests || []).forEach((req) => {
      const day = formatDate(req.created_at);
      reqsByDay[day] = (reqsByDay[day] || 0) + 1;
    });

    (offers || []).forEach((off) => {
      const day = formatDate(off.created_at);
      offersByDay[day] = (offersByDay[day] || 0) + 1;
    });

    return NextResponse.json({
      pendingDealers: pendingDealers || [],
      requests: requests || [],
      offers: offers || [],
      metrics: {
        totalDealers: totalDealersCount,
        approvedDealers: approvedDealersCount,
        pendingDealersCount: pendingDealers?.length || 0,
        totalRequests: requests?.length || 0,
        totalOffers: offers?.length || 0,
        requestsByDay: reqsByDay,
        offersByDay: offersByDay,
      },
    });
  } catch (error: any) {
    console.error('Admin data fetch exception:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
