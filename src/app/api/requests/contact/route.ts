import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { requestId, offerId, token, phoneShared = false } = body;

    if (!requestId || !offerId || !token) {
      return NextResponse.json(
        { error: 'Missing parameters (Required inputs are missing)' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseService();

    // 1. Verify token & retrieve buyer request
    const { data: buyerRequest, error: requestError } = await supabaseAdmin
      .from('buyer_requests')
      .select('*, products(*)')
      .eq('id', requestId)
      .eq('access_token', token)
      .single();

    if (requestError || !buyerRequest) {
      return NextResponse.json(
        { error: 'Access token validation failed or request not found.' },
        { status: 401 }
      );
    }

    // 2. Retrieve target dealer offer details
    const { data: dealerOffer, error: offerError } = await supabaseAdmin
      .from('dealer_offers')
      .select('*, dealers(*)')
      .eq('id', offerId)
      .eq('request_id', requestId)
      .single();

    if (offerError || !dealerOffer) {
      return NextResponse.json(
        { error: 'Dealer offer was not found for this request.' },
        { status: 404 }
      );
    }

    const productName = `${buyerRequest.products.brand} ${buyerRequest.products.name}`;
    const quotedPrice = dealerOffer.price;
    const dealer = dealerOffer.dealers;

    // 3. Update the offer status to accepted
    await supabaseAdmin
      .from('dealer_offers')
      .update({ status: 'accepted' })
      .eq('id', offerId);

    // Update the request status to fulfilled and save phone_shared status (Correction 4 & 5)
    await supabaseAdmin
      .from('buyer_requests')
      .update({ 
        status: 'fulfilled', 
        phone_shared: phoneShared 
      })
      .eq('id', requestId);

    // 4. Build pre-populated buyer message and return WhatsApp redirect link
    const cleanDealerPhone = dealer.whatsapp.replace(/[^0-9]/g, '');
    const formattedDealerPhone =
      cleanDealerPhone.startsWith('91') && cleanDealerPhone.length === 12
        ? cleanDealerPhone
        : cleanDealerPhone.length === 10
        ? `91${cleanDealerPhone}`
        : cleanDealerPhone;

    const greetingText = `Hi ${dealer.shop_name}, I accepted your offer of ₹${quotedPrice.toLocaleString('en-IN')} for ${productName} on MeraWalaPrice. Please confirm availability.`;
    const whatsappRedirectUrl = `https://wa.me/${formattedDealerPhone}?text=${encodeURIComponent(
      greetingText
    )}`;

    return NextResponse.json({ waUrl: whatsappRedirectUrl });
  } catch (error) {
    console.error('Contact API Exception:', error);
    return NextResponse.json(
      { error: 'Internal server error processing contact request.' },
      { status: 500 }
    );
  }
}
