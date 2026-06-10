import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { orgIdFromReq } from '@/lib/org';

// Validate an Employee ID so the device can "activate" as that employee.
// POST { code } -> { ok, employee: { code, name, department } }
export async function POST(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    const { code } = await req.json();
    const c = (code || '').toString().trim();
    if (!c) {
      return NextResponse.json({ ok: false, error: 'សូមបញ្ចូល Employee ID' }, { status: 400 });
    }

    let q = supabase
      .from('employees')
      .select('code, name, department, active')
      .eq('code', c);
    if (orgId) q = q.eq('org_id', orgId);
    const { data, error } = await q.single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'រក Employee ID នេះមិនឃើញទេ។ សូមទាក់ទង Admin។' });
    }
    if (data.active === false) {
      return NextResponse.json({ ok: false, error: 'គណនីបុគ្គលិកនេះត្រូវបានបិទ។' });
    }

    return NextResponse.json({ ok: true, employee: { code: data.code, name: data.name, department: data.department } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
