import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product_id, dealer_id, buyer_name, buyer_phone, locked_price, phone_shared } = body;

    if (!product_id || !dealer_id || !buyer_name || !buyer_phone || !locked_price) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supabase = getSupabaseService();

    // Create price lock
    const { data, error } = await supabase
      .from('price_locks')
      .insert({
        product_id,
        dealer_id,
        buyer_name,
        buyer_phone: phone_shared ? buyer_phone : null,
        locked_price,
        phone_shared,
        status: 'active',
        expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lock_id: data.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
