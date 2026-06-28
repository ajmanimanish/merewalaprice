import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { requestId, offerId, token } = body;

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
    const buyerName = buyerRequest.buyer_name;
    const buyerPhone = buyerRequest.buyer_phone;
    const dealer = dealerOffer.dealers;

    // 3. Dispatch WhatsApp Winner Notification to Dealer (Flow 3)
    const dealerNotificationText = `🎉 Customer aapke paas aa raha hai!

👤 ${buyerName} ne aapka offer accept kiya.
📦 Product: ${productName}
💰 Aapka quoted price: ₹${quotedPrice.toLocaleString('en-IN')}
📞 Customer WhatsApp: ${buyerPhone}

Aap customer ko contact karein ya unke message ka wait karein!`;

    // Trigger background send to dealer
    sendWhatsAppMessage({
      phone: dealer.whatsapp || dealer.phone,
      messageText: dealerNotificationText,
      dealerId: dealer.id,
      requestId: requestId,
    }).catch((err) => console.error('Dealer notification failure:', err));

    // 4. Update the offer status to accepted
    await supabaseAdmin
      .from('dealer_offers')
      .update({ status: 'accepted' })
      .eq('id', offerId);

    // Update the request status to fulfilled (Fix 9)
    await supabaseAdmin
      .from('buyer_requests')
      .update({ status: 'fulfilled' })
      .eq('id', requestId);

    // Notify other dealers that they did not win this time (Fix 9)
    try {
      const { data: otherOffers } = await supabaseAdmin
        .from('dealer_offers')
        .select('*, dealers(*)')
        .eq('request_id', requestId)
        .neq('id', offerId);

      if (otherOffers && otherOffers.length > 0) {
        const otherDealersMsg = `Is baar nahi hua, agli baar zaroor! Naya request aane par aapko notify karenge.`;
        const notifyPromises = otherOffers.map((offerItem) => {
          if (offerItem.dealers) {
            return sendWhatsAppMessage({
              phone: offerItem.dealers.whatsapp || offerItem.dealers.phone,
              messageText: otherDealersMsg,
              dealerId: offerItem.dealers.id,
              requestId: requestId,
            });
          }
          return Promise.resolve(true);
        });
        Promise.all(notifyPromises).catch((err) =>
          console.error('Failed dispatching other dealer notifications:', err)
        );
      }
    } catch (otherErr) {
      console.error('Error fetching other offers for rejection notify:', otherErr);
    }

    // 5. Build pre-populated buyer message and return WhatsApp redirect link
    const cleanDealerPhone = dealer.whatsapp.replace(/[^0-9]/g, '');
    const formattedDealerPhone =
      cleanDealerPhone.startsWith('91') && cleanDealerPhone.length === 12
        ? cleanDealerPhone
        : cleanDealerPhone.length === 10
        ? `91${cleanDealerPhone}`
        : cleanDealerPhone;

    const greetingText = `Hello ${dealer.shop_name}, maine MereWalaPrice par aapka ${productName} ke liye ₹${quotedPrice.toLocaleString('en-IN')} ka offer accept kiya hai. Aap se deal karni hai.`;
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
