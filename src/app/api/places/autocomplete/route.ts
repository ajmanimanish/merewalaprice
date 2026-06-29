import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get('input');
  const apiKey = process.env.OLA_MAPS_API_KEY;

  if (!apiKey || !input) {
    return NextResponse.json({ predictions: [] });
  }

  try {
    // Call Ola Maps Autocomplete with location bias for Bhopal (23.2599, 77.4126)
    const url = `https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(input)}&api_key=${apiKey}&location=23.2599,77.4126`;
    
    const response = await fetch(url, {
      headers: {
        'X-Request-Id': crypto.randomUUID()
      }
    });

    if (!response.ok) {
      throw new Error(`Ola Maps Autocomplete API returned status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Ola Maps Autocomplete API Error:', error);
    return NextResponse.json({ predictions: [] });
  }
}
