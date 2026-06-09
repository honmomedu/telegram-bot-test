import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { DEFAULT_SETTINGS } from '@/lib/payroll';

let memSettings = { ...DEFAULT_SETTINGS };

export async function GET() {
  try {
    const { data, error } = await supabase.from('payroll_settings').select('*').eq('id', 1).single();
    if (error || !data) {
      return NextResponse.json({ success: true, settings: memSettings, _fallback: true });
    }
    return NextResponse.json({ success: true, settings: data });
  } catch {
    return NextResponse.json({ success: true, settings: memSettings, _fallback: true });
  }
}

export async function POST(req: Request) {
  try {
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
    memSettings = { ...settings };

    const { error } = await supabase.from('payroll_settings').upsert({ id: 1, ...settings }, { onConflict: 'id' });
    if (error) return NextResponse.json({ success: true, savedToCloud: false, reason: error.message });
    return NextResponse.json({ success: true, savedToCloud: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
