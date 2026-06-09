import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Bulk import / update employees from a parsed spreadsheet.
// POST { rows: [{ code, name, department?, pay_type?, base_salary?, hourly_rate? }] }
// Upserts by `code` (creates new, updates existing).
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows: any[] = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'គ្មានទិន្នន័យ' }, { status: 400 });
    }

    const clean = rows
      .map((r) => ({
        code: (r.code ?? '').toString().trim(),
        name: (r.name ?? '').toString().trim(),
        department: r.department ? r.department.toString().trim() : null,
        pay_type: r.pay_type === 'hourly' ? 'hourly' : 'monthly',
        base_salary: Number(r.base_salary) || 0,
        hourly_rate: Number(r.hourly_rate) || 0,
      }))
      .filter((r) => r.code && r.name);

    if (clean.length === 0) {
      return NextResponse.json({ success: false, error: 'រកមិនឃើញជួរត្រឹមត្រូវ (តម្រូវ code + name)' }, { status: 400 });
    }

    // De-duplicate by code (last wins)
    const byCode = new Map<string, any>();
    for (const r of clean) byCode.set(r.code, r);
    const finalRows = [...byCode.values()];

    const { data, error } = await supabase
      .from('employees')
      .upsert(finalRows, { onConflict: 'code' })
      .select('code');

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, imported: data?.length ?? finalRows.length, total: rows.length });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
