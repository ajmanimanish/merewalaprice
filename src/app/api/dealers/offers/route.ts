import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      requestId,
      dealerId,
      price,
      inclusions = [],
      availability,
      alternativeModel = null,
      alternativePrice = null,
      alternativeNote = null,
    } = body;

    if (!requestId || !dealerId || !price || !availability) {
      return NextResponse.json(
        { error: 'Mandatory parameters missing.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseService();

    // 1. Double check if dealer exists and is approved
    const { data: dealer, error: dealerError } = await supabaseAdmin
      .from('dealers')
      .select('*')
      .eq('id', dealerId)
      .single();

    if (dealerError || !dealer) {
      return NextResponse.json(
        { error: 'Dealer profile not found.' },
        { status: 404 }
      );
    }

    if (!dealer.is_approved) {
      return NextResponse.json(
        { error: 'Your account is pending approval. You cannot submit offers yet.' },
        { status: 403 }
      );
    }

    // 2. Validate request exists and is open
    const { data: buyerRequest, error: requestError } = await supabaseAdmin
      .from('buyer_requests')
      .select('*, products(*)')
      .eq('id', requestId)
      .single();

    if (requestError || !buyerRequest) {
      return NextResponse.json(
        { error: 'Buyer request not found.' },
        { status: 404 }
      );
    }

    if (buyerRequest.status !== 'open') {
      return NextResponse.json(
        { error: 'This request has expired or is closed.' },
        { status: 400 }
      );
    }

    // 3. Make sure dealer handles this category
    const requestCategory = buyerRequest.products.category;
    if (!dealer.categories.includes(requestCategory)) {
      return NextResponse.json(
        { error: 'You do not deal in this category of products.' },
        { status: 400 }
      );
    }

    // 4. Check if the dealer has already submitted an offer for this request
    const { data: existingOffer } = await supabaseAdmin
      .from('dealer_offers')
      .select('id')
      .eq('request_id', requestId)
      .eq('dealer_id', dealerId)
      .maybeSingle();

    if (existingOffer) {
      return NextResponse.json(
        { error: 'You have already submitted an offer for this request.' },
        { status: 400 }
      );
    }

    // 5. Insert new offer
    const { data: newOffer, error: insertError } = await supabaseAdmin
      .from('dealer_offers')
      .insert({
        request_id: requestId,
        dealer_id: dealerId,
        price: parseInt(price, 10),
        inclusions,
        availability,
        alternative_model: alternativeModel || null,
        alternative_price: alternativePrice ? parseInt(alternativePrice, 10) : null,
        alternative_note: alternativeNote || null,
        status: 'pending',
      })
      .select('*')
      .single();

    if (insertError || !newOffer) {
      console.error('Insert offer error:', insertError);
      return NextResponse.json(
        { error: 'Failed to submit offer.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, offerId: newOffer.id });
  } catch (error) {
    console.error('Submit Offer API Exception:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
