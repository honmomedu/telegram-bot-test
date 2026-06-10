import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { orgIdFromReq } from '@/lib/org';

// Identify an employee by a tapped NFC tag serial (within the org).
// GET ?nfc=<serial>
export async function GET(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    const nfc = new URL(req.url).searchParams.get('nfc');
    if (!nfc) return NextResponse.json({ matched: false, error: 'Missing nfc' }, { status: 400 });

    let q = supabase.from('employees').select('code, name, active').eq('nfc_id', nfc);
    if (orgId) q = q.eq('org_id', orgId);
    const { data: emp } = await q.single();
    if (!emp || emp.active === false) return NextResponse.json({ matched: false });

    return NextResponse.json({ matched: true, code: emp.code, name: emp.name });
  } catch (e: any) {
    return NextResponse.json({ matched: false, error: e?.message }, { status: 500 });
  }
}
