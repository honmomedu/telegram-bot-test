import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Manual timesheet hours per day (for part-timers / corrections).
// GET ?month=YYYY-MM&code=EMP  -> entries
// POST { employee_code, work_date 'YYYY-MM-DD', hours, note }  (upsert)
// DELETE ?id=...  or  ?code=EMP&date=YYYY-MM-DD

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get('month');
    const code = url.searchParams.get('code');
    let q = supabase
      .from('manual_hours')
      .select('id, employee_code, work_date, hours, note')
      .order('work_date', { ascending: true });
    if (code) q = q.eq('employee_code', code);
    if (month) q = q.like('work_date', `${month}-%`);
    const { data, error } = await q;
    if (error) return NextResponse.json({ success: true, entries: [], _fallback: true });
    return NextResponse.json({ success: true, entries: data });
  } catch {
    return NextResponse.json({ success: true, entries: [], _fallback: true });
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const employee_code = (b.employee_code || '').toString().trim();
    const work_date = (b.work_date || '').toString().trim();
    const hours = Number(b.hours);
    if (!employee_code || !/^\d{4}-\d{2}-\d{2}$/.test(work_date) || isNaN(hours) || hours < 0) {
      return NextResponse.json({ success: false, error: 'ទិន្នន័យមិនត្រឹមត្រូវ' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('manual_hours')
      .upsert({ employee_code, work_date, hours, note: b.note || null }, { onConflict: 'employee_code,work_date' })
      .select()
      .single();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, entry: data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const code = url.searchParams.get('code');
    const date = url.searchParams.get('date');
    if (id) {
      await supabase.from('manual_hours').delete().eq('id', id);
    } else if (code && date) {
      await supabase.from('manual_hours').delete().eq('employee_code', code).eq('work_date', date);
    } else {
      return NextResponse.json({ success: false, error: 'Missing id or code+date' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
