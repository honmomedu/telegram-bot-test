import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { orgIdFromReq } from '@/lib/org';

// GET ?month=YYYY-MM[&code=EMP] -> list adjustments
export async function GET(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    const url = new URL(req.url);
    const month = url.searchParams.get('month');
    const code = url.searchParams.get('code');
    let q = supabase
      .from('payroll_adjustments')
      .select('id, employee_code, month, type, amount, reason, created_at')
      .order('created_at', { ascending: false });
    if (orgId) q = q.eq('org_id', orgId);
    if (month) q = q.eq('month', month);
    if (code) q = q.eq('employee_code', code);
    const { data, error } = await q;
    if (error) return NextResponse.json({ success: true, adjustments: [], _fallback: true });
    return NextResponse.json({ success: true, adjustments: data });
  } catch (e: any) {
    return NextResponse.json({ success: true, adjustments: [], _fallback: true });
  }
}

// POST { employee_code, month, type:'add'|'deduct', amount, reason }
export async function POST(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    const b = await req.json();
    const employee_code = (b.employee_code || '').toString().trim();
    const month = (b.month || '').toString().trim();
    const type = b.type === 'deduct' ? 'deduct' : 'add';
    const amount = Number(b.amount);
    if (!employee_code || !month || !amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'ទិន្នន័យមិនត្រឹមត្រូវ' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('payroll_adjustments')
      .insert({ employee_code, month, type, amount, reason: b.reason || null, org_id: orgId })
      .select()
      .single();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, adjustment: data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

// DELETE ?id=...
export async function DELETE(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    await supabase.from('payroll_adjustments').delete().eq('id', id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
