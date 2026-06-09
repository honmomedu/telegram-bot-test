import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to fallback to in-memory if DB fails
let memCoords = { lat: 11.5564, lng: 104.9282, radius: 100 };

export async function GET() {
  try {
    const { data, error } = await supabase.from('system_settings').select('lat, lng, radius').eq('id', 1).single();
    if (error || !data) {
        return NextResponse.json({ success: true, ...memCoords, _fallback: true });
    }
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json({ success: true, ...memCoords, _fallback: true });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lat, lng, radius } = body;
    
    memCoords = { lat, lng, radius }; // update fallback
    
    const { error } = await supabase.from('system_settings').upsert({
       id: 1, lat, lng, radius
    });

    if (error) {
       console.error("Supabase config save error:", error);
       return NextResponse.json({ success: true, savedToMemory: true, error: error.message });
    }

    return NextResponse.json({ success: true, savedToSupabase: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
