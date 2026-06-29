import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/notifications';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password, dealerId, action } = body;

    const adminPassword = process.env.ADMIN_PASSWORD || 'bhopalprice123';

    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!dealerId || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseService();

    if (action === 'approve') {
      // 1. Fetch dealer details
      const { data: dealer, error: getErr } = await supabaseAdmin
        .from('dealers')
        .select('*')
        .eq('id', dealerId)
        .single();

      if (getErr || !dealer) {
        return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
      }

      // 2. Set is_approved to true
      const { error: updateErr } = await supabaseAdmin
        .from('dealers')
        .update({ is_approved: true })
        .eq('id', dealerId);

      if (updateErr) {
        throw updateErr;
      }

      // 3. Dispatch WhatsApp Notification to Dealer
      const origin = request.headers.get('origin') || 'http://localhost:3000';
      const dashboardLink = `${origin}/dealer/dashboard`;

      const approvalText = `Congratulations!

Your shop "${dealer.shop_name}" has been approved.

You can now view buyer requests and send direct quotes. Log in to your dashboard to start bidding:
🔗 ${dashboardLink}`;

      // Send WhatsApp message to dealer
      await sendWhatsAppMessage({
        phone: dealer.whatsapp || dealer.phone,
        messageText: approvalText,
        dealerId: dealer.id,
      });

    } else if (action === 'reject') {
      // For rejection, we simply delete the dealer profile or delete the auth user as well.
      // To keep it clean, let's fetch the dealer, delete from dealers table, and delete from auth.users.
      const { data: dealer } = await supabaseAdmin
        .from('dealers')
        .select('*')
        .eq('id', dealerId)
        .single();

      if (dealer) {
        // Delete dealer profile
        await supabaseAdmin.from('dealers').delete().eq('id', dealerId);
        
        // Delete Auth user
        if (dealer.auth_user_id) {
          await supabaseAdmin.auth.admin.deleteUser(dealer.auth_user_id);
        }
      }
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin approval action exception:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
