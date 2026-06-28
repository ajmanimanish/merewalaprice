import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      shopName,
      ownerName,
      whatsapp,
      password,
      area,
      categories = [],
      brands = [],
    } = body;

    if (!shopName || !ownerName || !whatsapp || !password || !area) {
      return NextResponse.json(
        { error: 'Sabhi mandatory fields bharein (Mandatory fields are missing).' },
        { status: 400 }
      );
    }

    const cleanPhone = whatsapp.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: 'WhatsApp number 10-digit hona chahiye.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseService();

    // 1. Create a Supabase Auth user with a shadow email format
    const shadowEmail = `${cleanPhone}@merawalaprice.in`;
    
    // Check if user already exists in auth
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === shadowEmail);

    if (userExists) {
      return NextResponse.json(
        { error: 'Yeh number pehle se registered hai (This number is already registered).' },
        { status: 400 }
      );
    }

    // Sign up user via admin helper so they don't need email verification
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: shadowEmail,
      password: password,
      email_confirm: true,
      user_metadata: { shop_name: shopName, owner_name: ownerName }
    });

    if (authError || !authData.user) {
      console.error('Auth create user error:', authError);
      return NextResponse.json(
        { error: 'Auth credentials create karne me fail (Auth registration failed).' },
        { status: 500 }
      );
    }

    // 2. Insert profile record in dealers table
    const { data: dealer, error: dbError } = await supabaseAdmin
      .from('dealers')
      .insert({
        auth_user_id: authData.user.id,
        shop_name: shopName,
        owner_name: ownerName,
        phone: cleanPhone,
        whatsapp: cleanPhone,
        area: area,
        city: 'Bhopal',
        categories: categories,
        brands: brands,
        is_approved: false, // Must be approved by admin
      })
      .select('*')
      .single();

    if (dbError || !dealer) {
      console.error('DB insert dealer error:', dbError);
      // Rollback Auth user if profile fails to create
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return NextResponse.json(
        { error: 'Dukaan record create karne me error (Failed to create profile).' },
        { status: 500 }
      );
    }

    // 3. Send WhatsApp Confirmation to Dealer
    const welcomeMessage = `🔔 MereWalaPrice Par Registration Safal!

Shop Name: ${shopName}
Owner: ${ownerName} ji

Aapki registration request admin panel pe bhej di gayi hai. Approval milte hi aap Bhopal requests par deals quote kar sakenge! 👍`;

    sendWhatsAppMessage({
      phone: cleanPhone,
      messageText: welcomeMessage,
      dealerId: dealer.id,
    }).catch(err => console.error('Dealer welcome notify fail:', err));

    // 4. Send WhatsApp Notification to Admin
    // Construct message to inform admin of pending request
    const adminMessage = `📢 Naya Dealer Registration!

Dukaan: ${shopName}
Owner: ${ownerName}
Area: ${area}
WhatsApp: ${cleanPhone}

Approve karne ke liye admin panel check karein.`;

    // Send to admin mock - phone: 919999999999
    sendWhatsAppMessage({
      phone: '9999999999',
      messageText: adminMessage,
      dealerId: dealer.id
    }).catch(err => console.error('Admin notify fail:', err));

    return NextResponse.json({ success: true, dealerId: dealer.id });
  } catch (error) {
    console.error('Registration API exception:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
