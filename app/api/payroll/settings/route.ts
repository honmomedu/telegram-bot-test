import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { DEFAULT_SETTINGS } from '@/lib/payroll';
import { orgIdFromReq } from '@/lib/org';

// Payroll settings stored per-organization in organizations.payroll (JSONB).

export async function GET(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    if (orgId) {
      const { data } = await supabase.from('organizations').select('payroll').eq('id', orgId).single();
      if (data?.payroll) return NextResponse.json({ success: true, settings: { ...DEFAULT_SETTINGS, ...data.payroll } });
    }
    return NextResponse.json({ success: true, settings: { ...DEFAULT_SETTINGS }, _fallback: true });
  } catch {
    return NextResponse.json({ success: true, settings: { ...DEFAULT_SETTINGS }, _fallback: true });
  }
}

export async function POST(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    const body = await req.json();
    const settings = {
      work_start_time: body.work_start_time || '08:00',
      work_end_time: body.work_end_time || '17:00',
      late_threshold_min: Number(body.late_threshold_min ?? 15),
      standard_days: Number(body.standard_days ?? 26),
      late_deduction: Number(body.late_deduction ?? 0),
      absent_deduction: Number(body.absent_deduction ?? 0),
      currency: body.currency || 'USD',
      payday: Number(body.payday ?? 28),
    };

    if (orgId) {
      const { error } = await supabase.from('organizations').update({ payroll: settings }).eq('id', orgId);
      if (!error) return NextResponse.json({ success: true, savedToCloud: true });
    }
    return NextResponse.json({ success: true, savedToCloud: false });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
