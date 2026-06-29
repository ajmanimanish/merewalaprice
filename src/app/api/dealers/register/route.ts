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
      email,
      password,
      area,
      categories = [],
      brands = [],
      address = '',
      latitude = null,
      longitude = null,
    } = body;

    if (!shopName || !ownerName || !whatsapp || !email || !password || !area) {
      return NextResponse.json(
        { error: 'Mandatory fields are missing.' },
        { status: 400 }
      );
    }

    const cleanPhone = whatsapp.replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: 'WhatsApp number must be 10 digits.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseService();

    // 1. Create a Supabase Auth user with the actual email
    const shadowEmail = email.trim().toLowerCase();
    
    // Check if user already exists in auth
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === shadowEmail);

    if (userExists) {
      return NextResponse.json(
        { error: 'This email is already registered.' },
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
        { error: 'Auth registration failed.' },
        { status: 500 }
      );
    }

    // 2. Insert profile record in dealers table (including email, address, geo)
    const { data: dealer, error: dbError } = await supabaseAdmin
      .from('dealers')
      .insert({
        auth_user_id: authData.user.id,
        shop_name: shopName,
        owner_name: ownerName,
        phone: cleanPhone,
        whatsapp: cleanPhone,
        email: shadowEmail,
        area: area,
        city: 'Bhopal',
        categories: categories,
        brands: brands,
        is_approved: false, // Must be approved by admin
        address: address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      })
      .select('*')
      .single();

    if (dbError || !dealer) {
      console.error('DB insert dealer error:', dbError);
      // Rollback Auth user if profile fails to create
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      
      return NextResponse.json(
        { error: 'Failed to create profile record.' },
        { status: 500 }
      );
    }

    // 3. Send WhatsApp Confirmation to Dealer
    const welcomeMessage = `MereWalaPrice Registration Submitted!

Shop Name: ${shopName}
Owner: ${ownerName}

Your registration request has been sent to the admin. You will be able to submit quotes once approved!`;

    sendWhatsAppMessage({
      phone: cleanPhone,
      messageText: welcomeMessage,
      dealerId: dealer.id,
    }).catch(err => console.error('Dealer welcome notify fail:', err));

    // 4. Send WhatsApp Notification to Admin
    // Construct message to inform admin of pending request
    const adminMessage = `New Dealer Registration Request!

Shop: ${shopName}
Owner: ${ownerName}
Area: ${area}
WhatsApp: ${cleanPhone}

Check the admin panel to approve this dealer.`;

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
