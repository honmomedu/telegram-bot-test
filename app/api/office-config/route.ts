import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { orgIdFromReq, orgSlugFromReq, DEFAULT_ORG_SLUG } from '@/lib/org';

// Office geofence config, stored per-organization in organizations.geofence.
// Falls back to the legacy system_settings table (default org) and memory.

let memCoords = { lat: 11.5564, lng: 104.9282, radius: 100 };

export async function GET(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    if (orgId) {
      const { data } = await supabase.from('organizations').select('geofence').eq('id', orgId).single();
      const g = data?.geofence;
      if (g && g.lat != null && g.lng != null) {
        return NextResponse.json({ success: true, lat: g.lat, lng: g.lng, radius: g.radius ?? 100 });
      }
    }
    // Legacy single-row fallback (default org only)
    if (orgSlugFromReq(req) === DEFAULT_ORG_SLUG) {
      const { data } = await supabase.from('system_settings').select('lat, lng, radius').eq('id', 1).single();
      if (data) return NextResponse.json({ success: true, ...data });
    }
    return NextResponse.json({ success: true, ...memCoords, _fallback: true });
  } catch (error: any) {
    return NextResponse.json({ success: true, ...memCoords, _fallback: true });
  }
}

export async function POST(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    const { lat, lng, radius } = await req.json();
    memCoords = { lat, lng, radius };

    if (orgId) {
      const { error } = await supabase.from('organizations').update({ geofence: { lat, lng, radius } }).eq('id', orgId);
      if (!error) return NextResponse.json({ success: true, savedToCloud: true });
    }
    // legacy fallback
    const { error } = await supabase.from('system_settings').upsert({ id: 1, lat, lng, radius });
    if (error) return NextResponse.json({ success: true, savedToMemory: true, error: error.message });
    return NextResponse.json({ success: true, savedToSupabase: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
