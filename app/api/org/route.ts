import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { orgIdFromReq, orgSlugFromReq } from '@/lib/org';

// Public org info for the current tenant: name + enabled attendance methods.
const DEFAULT_METHODS = { face: true, office_qr: true, qr_card: false, nfc: false, manual: false };

export async function GET(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    if (orgId) {
      const { data } = await supabase.from('organizations').select('name, attendance_methods, active').eq('id', orgId).single();
      if (data) {
        return NextResponse.json({
          success: true,
          slug: orgSlugFromReq(req),
          name: data.name,
          active: data.active !== false,
          methods: { ...DEFAULT_METHODS, ...(data.attendance_methods || {}) },
        });
      }
    }
    return NextResponse.json({ success: true, slug: orgSlugFromReq(req), name: '', active: true, methods: DEFAULT_METHODS, _fallback: true });
  } catch {
    return NextResponse.json({ success: true, name: '', active: true, methods: DEFAULT_METHODS, _fallback: true });
  }
}
