import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { orgIdFromReq } from '@/lib/org';
import { verifyCardPayload } from '@/lib/cardToken';

// Identify an employee from a scanned QR card (POST) or an NFC serial (GET).

export async function POST(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    const { card } = await req.json();

    let secret = '';
    if (orgId) {
      const { data: org } = await supabase.from('organizations').select('qr_secret').eq('id', orgId).single();
      secret = org?.qr_secret || '';
    }

    const code = verifyCardPayload(card, secret);
    if (!code) return NextResponse.json({ matched: false, reason: 'invalid-card' });

    let q = supabase.from('employees').select('code, name, active').eq('code', code);
    if (orgId) q = q.eq('org_id', orgId);
    const { data: emp } = await q.single();
    if (!emp || emp.active === false) return NextResponse.json({ matched: false });

    return NextResponse.json({ matched: true, code: emp.code, name: emp.name });
  } catch (e: any) {
    return NextResponse.json({ matched: false, error: e?.message }, { status: 500 });
  }
}
