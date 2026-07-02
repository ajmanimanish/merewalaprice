import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      productId,
      buyerName,
      buyerPhone,
      budget,
      area,
      urgency,
      purchaseType,
      whatsDifferent,
      quantity = 1,
      userId = null,
    } = body;

    const supabaseAdmin = getSupabaseService();

    // 1. Basic system rate limiting (Fix 7)
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from('buyer_requests')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo);

    if (count && count > 50) {
      return NextResponse.json(
        { error: 'System is busy. Please try again in a few minutes.' },
        { status: 429 }
      );
    }

    if (!productId || !buyerName || !buyerPhone || !budget || !area || !urgency || !purchaseType) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    // 2. Fetch product details
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found.' },
        { status: 404 }
      );
    }

    // 3. Prevent duplicate requests (Fix 5)
    const { data: existing } = await supabaseAdmin
      .from('buyer_requests')
      .select('id, access_token')
      .eq('product_id', productId)
      .eq('buyer_phone', buyerPhone)
      .eq('status', 'open')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        error: 'You already have an active request for this product. Check your existing results.',
        existingRequestId: existing.id,
        accessToken: existing.access_token
      }, { status: 409 });
    }

    // 4. Create the buyer request
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now
    const { data: newRequest, error: insertError } = await supabaseAdmin
      .from('buyer_requests')
      .insert({
        product_id: productId,
        buyer_phone: buyerPhone,
        buyer_name: buyerName,
        budget: parseInt(budget, 10),
        area,
        urgency,
        purchase_type: purchaseType,
        whats_different: whatsDifferent,
        quantity: parseInt(quantity, 10),
        status: 'open',
        expires_at: expiresAt,
      })
      .select('*')
      .single();

    if (insertError || !newRequest) {
      console.error('Insert request error:', insertError);
      return NextResponse.json(
        { error: 'Could not create request. Please try again.' },
        { status: 500 }
      );
    }

    // 5. Log Search History with Access Token (Correction 5)
    if (userId) {
      const { error: searchError } = await supabaseAdmin
        .from('user_searches')
        .insert({
          user_id: userId,
          product_id: productId,
          search_query: `${product.brand} ${product.name} ${product.model_number} (${whatsDifferent?.replace(/_/g, ' ') || ''})`,
          access_token: newRequest.access_token
        });
      if (searchError) {
        console.error('Logging request search error:', searchError);
      }
    }

    // 6. Trigger Scraper Asynchronously (Fire and Forget)
    const scraperUrl = process.env.NEXT_PUBLIC_SCRAPER_URL || 'http://localhost:8000';
    fetch(`${scraperUrl.replace(/\/$/, '')}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: newRequest.product_id,
        model_number: product.model_number,
        amazon_url: product.amazon_url || null,
        flipkart_url: product.flipkart_url || null,
      }),
    }).catch((err) => {
      console.error('Asynchronous Scraper trigger error:', err.message);
    });

    // 7. Return created request identifier & access token
    return NextResponse.json({
      requestId: newRequest.id,
      accessToken: newRequest.access_token,
    });
  } catch (error: any) {
    console.error('Request API handler exception:', error);
    return NextResponse.json(
      { error: 'Server details internal error.' },
      { status: 500 }
    );
  }
}
