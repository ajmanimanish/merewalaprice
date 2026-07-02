import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    
    const supabase = getSupabaseService();
    const { error } = await supabase
      .from('ai_waitlist')
      .upsert({ email }, { onConflict: 'email' });

    if (error) {
      console.error('Waitlist DB insert error:', error);
      return NextResponse.json({ error: 'Database insert failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Waitlist API Exception:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
