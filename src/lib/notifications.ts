import { getSupabaseService } from './supabase';

interface SendWhatsAppParams {
  phone: string;
  messageText: string;
  dealerId?: string;
  requestId?: string;
}

/**
 * Sends a WhatsApp message using the Wati API, with support for logging and credential fallback.
 */
export async function sendWhatsAppMessage({
  phone,
  messageText,
  dealerId,
  requestId,
}: SendWhatsAppParams): Promise<boolean> {
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  
  // Strip all leading zeros
  while (cleanPhone.startsWith('0')) {
    cleanPhone = cleanPhone.substring(1);
  }

  // Standardize Indian numbers to 91XXXXXXXXXX
  const formattedPhone =
    cleanPhone.length === 10
      ? `91${cleanPhone}`
      : cleanPhone.startsWith('91') && cleanPhone.length === 12
      ? cleanPhone
      : cleanPhone;

  const endpoint = process.env.WATI_ENDPOINT || '';
  const apiKey = process.env.WATI_API_KEY || '';

  let success = false;

  if (endpoint && apiKey) {
    try {
      const url = `${endpoint.replace(/\/$/, '')}/api/v1/sendSessionMessage/${formattedPhone}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageText }),
      });

      if (response.ok) {
        success = true;
      } else {
        const errText = await response.text();
        console.error(`Wati API error response for ${formattedPhone}:`, errText);
      }
    } catch (error) {
      console.error(`Wati dispatch exception to ${formattedPhone}:`, error);
    }
  } else {
    // Fallback: Mock logging
    console.log(`\n--- [MOCK WHATSAPP DISPATCH] ---\nTo: ${formattedPhone}\nMessage:\n${messageText}\n---------------------------------\n`);
    success = true;
  }

  // Write notification log using the service-role client
  try {
    const supabaseAdmin = getSupabaseService();
    const { error } = await supabaseAdmin.from('notifications_log').insert({
      dealer_id: dealerId || null,
      request_id: requestId || null,
      channel: 'whatsapp',
      status: success ? 'sent' : 'failed',
      sent_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error logging notification to database:', error);
    }
  } catch (dbError) {
    console.error('Failed to log notification due to db exception:', dbError);
  }

  return success;
}
