import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/notifications';

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
      quantity = 1,
    } = body;

    if (!productId || !buyerName || !buyerPhone || !budget || !area || !urgency || !purchaseType) {
      return NextResponse.json(
        { error: 'Sabhi fields bharna zaroori hai (All fields are required).' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseService();

    // 1. Fetch product details
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product nahi mila (Product not found).' },
        { status: 404 }
      );
    }

    // 2. Create the buyer request
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
        quantity: parseInt(quantity, 10),
        status: 'open',
        expires_at: expiresAt,
      })
      .select('*')
      .single();

    if (insertError || !newRequest) {
      console.error('Insert request error:', insertError);
      return NextResponse.json(
        { error: 'Request create karne me dikkat aayi (Could not create request).' },
        { status: 500 }
      );
    }

    // 3. Trigger Scraper Asynchronously (Fire and Forget)
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

    // 4. Trigger Dealer Broadcast (Flow 1)
    // Find all approved dealers where categories overlap AND city = Bhopal
    const { data: dealers, error: dealersError } = await supabaseAdmin
      .from('dealers')
      .select('*')
      .eq('is_approved', true)
      .eq('city', 'Bhopal')
      .contains('categories', [product.category]);

    if (dealersError) {
      console.error('Dealers lookup error:', dealersError);
    } else if (dealers && dealers.length > 0) {
      // Get base URL for offer link
      const origin = request.headers.get('origin') || 'http://localhost:3000';
      
      // Send broadcast to each matching dealer
      const broadcastPromises = dealers.map((dealer) => {
        const offerLink = `${origin}/dealer/dashboard?requestId=${newRequest.id}`;
        
        // Translating urgency enum for WhatsApp friendly view
        const urgencyLabel = 
          urgency === 'today' ? 'Aaj hi 🔥' : 
          urgency === 'this_week' ? 'Is hafte (1-2 days)' : 
          'Sirf price check';

        // Translating purchase type
        const typeLabel = 
          purchaseType === 'personal' ? 'Ghar ke liye' : 
          purchaseType === 'business' ? 'Resale ke liye' : 
          'Bulk (3+ units)';

        const messageText = `🔔 Naya Customer Request!

📦 Product: ${product.brand} ${product.name}
💰 Budget: ₹${newRequest.budget.toLocaleString('en-IN')}
📍 Location: ${newRequest.area}
⚡ Urgency: ${urgencyLabel}
👤 Type: ${typeLabel}

Offer submit karne ke liye link pe click karein:
🔗 ${offerLink}

⏰ Sirf 2 ghante bache hain!`;

        return sendWhatsAppMessage({
          phone: dealer.whatsapp || dealer.phone,
          messageText,
          dealerId: dealer.id,
          requestId: newRequest.id,
        });
      });

      // Execute broadcasts in background without delaying user response
      Promise.all(broadcastPromises).catch((err) => {
        console.error('Broadcast error:', err);
      });
    }

    // 5. Return created request identifier & access token
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
