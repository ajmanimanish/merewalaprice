import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('place_id');
  const apiKey = process.env.OLA_MAPS_API_KEY;

  if (!apiKey || !placeId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const url = `https://api.olamaps.io/places/v1/details?place_id=${encodeURIComponent(placeId)}&api_key=${apiKey}`;
    
    const response = await fetch(url, {
      headers: {
        'X-Request-Id': crypto.randomUUID()
      }
    });

    if (!response.ok) {
      throw new Error(`Ola Maps Details API returned status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Ola Maps Details API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch details' }, { status: 500 });
  }
}
