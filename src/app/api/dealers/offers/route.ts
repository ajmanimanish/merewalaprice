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
        { error: 'Mandatory parameters missing (Price aur Availability bharein).' },
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
        { error: 'Aapka account abhi tak approved nahi hai. Bids nahi bhej sakte.' },
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
        { error: 'Yeh request ab close/expire ho chuki hai.' },
        { status: 400 }
      );
    }

    // 3. Make sure dealer handles this category
    const requestCategory = buyerRequest.products.category;
    if (!dealer.categories.includes(requestCategory)) {
      return NextResponse.json(
        { error: 'Aap is category ke products me deal nahi karte hain.' },
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
        { error: 'Aapne is request par pehle hi offer de diya hai.' },
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
        { error: 'Offer submit karne me problem aayi.' },
        { status: 500 }
      );
    }

    // 6. Check if we have received 3 offers for this request to trigger Flow 2 buyer results WhatsApp
    const { count: offerCount } = await supabaseAdmin
      .from('dealer_offers')
      .select('*', { count: 'exact', head: true })
      .eq('request_id', requestId);

    if (offerCount !== null && offerCount >= 3) {
      // Trigger Flow 2 buyer notification
      // Ensure we haven't already sent buyer results
      const { data: logCheck } = await supabaseAdmin
        .from('notifications_log')
        .select('id')
        .eq('request_id', requestId)
        .eq('channel', 'whatsapp')
        .contains('status', ['sent']) // Already sent something
        .limit(1);

      // If no buyer result notification logged, send one!
      if (!logCheck || logCheck.length === 0) {
        // Fetch best local price offer
        const { data: bestOffer } = await supabaseAdmin
          .from('dealer_offers')
          .select('*, dealers(*)')
          .eq('request_id', requestId)
          .order('price', { ascending: true })
          .limit(1)
          .single();

        // Fetch best online price
        const { data: bestOnline } = await supabaseAdmin
          .from('online_prices')
          .select('*')
          .eq('product_id', buyerRequest.product_id)
          .order('true_cost', { ascending: true })
          .limit(1)
          .single();

        if (bestOffer) {
          const buyerName = buyerRequest.buyer_name;
          const productName = `${buyerRequest.products.brand} ${buyerRequest.products.name}`;
          const resultsLink = `${request.headers.get('origin') || 'http://localhost:3000'}/results/${requestId}?token=${buyerRequest.access_token}`;
          const n = offerCount;
          const bestPrice = bestOffer.price;
          const dealerName = bestOffer.dealers.shop_name;
          
          const onlineBest = bestOnline ? bestOnline.true_cost : 'N/A';
          const saving = bestOnline ? (bestOnline.true_cost - bestOffer.price) : 0;
          const savingText = saving > 0 ? `₹${saving.toLocaleString('en-IN')}` : 'Bachat!';

          const buyerNotifyMsg = `✅ ${buyerName} ji, aapke ${productName} ke liye ${n} offers aa gaye!

Best local price: ₹${bestPrice.toLocaleString('en-IN')} (${dealerName})
Online best: ₹${onlineBest.toLocaleString('en-IN')}
Aap bachate hain: ${savingText}

Offers aur dealer contact dekhne ke liye link open karein:
🔗 ${resultsLink}`;

          // Send message to buyer phone
          const { sendWhatsAppMessage } = await import('@/lib/notifications');
          sendWhatsAppMessage({
            phone: buyerRequest.buyer_phone,
            messageText: buyerNotifyMsg,
            requestId: requestId
          }).catch(err => console.error('Buyer Flow 2 notification fail:', err));
        }
      }
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
