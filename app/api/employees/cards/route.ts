import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { orgIdFromReq } from '@/lib/org';
import { buildCardPayload } from '@/lib/cardToken';

// Returns each employee with a signed QR-card payload + their NFC id, for the
// current org. Used by the admin card generator.
export async function GET(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);

    let secret = '';
    let orgName = '';
    if (orgId) {
      const { data: org } = await supabase.from('organizations').select('qr_secret, name').eq('id', orgId).single();
      secret = org?.qr_secret || '';
      orgName = org?.name || '';
    }

    let q = supabase.from('employees').select('code, name, department, nfc_id').order('code');
    if (orgId) q = q.eq('org_id', orgId);
    const { data, error } = await q;
    if (error) return NextResponse.json({ success: true, orgName, employees: [], _fallback: true });

    // Pull enrollment photos (best effort) to print on the card
    const photos = new Map<string, string>();
    try {
      let pq = supabase.from('face_enrollments').select('user_id, photo');
      if (orgId) pq = pq.eq('org_id', orgId);
      const { data: ph } = await pq;
      for (const p of ph || []) if (p.photo) photos.set(p.user_id, p.photo);
    } catch { /* ignore */ }

    const employees = (data || []).map((e: any) => ({
      code: e.code,
      name: e.name,
      department: e.department,
      nfc_id: e.nfc_id || null,
      photo: photos.get(e.code) || null,
      card: buildCardPayload(e.code, secret),
    }));

    return NextResponse.json({ success: true, orgName, employees });
  } catch (e: any) {
    return NextResponse.json({ success: true, orgName: '', employees: [], _fallback: true });
  }
}
