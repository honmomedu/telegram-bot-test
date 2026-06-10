import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { orgIdFromReq } from '@/lib/org';

// CRUD for employees, scoped to the current organization (org cookie).
// `code` is unique per org. Falls back to in-memory when tables are absent.

interface Employee {
  id?: string;
  code: string;
  name: string;
  department?: string | null;
  telegram_id?: number | null;
  active?: boolean;
  enrolled?: boolean;
  created_at?: string;
}

let memEmployees: Employee[] = [];

export async function GET(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    let q = supabase
      .from('employees')
      .select('id, code, name, department, telegram_id, active, enrolled, created_at')
      .order('created_at', { ascending: false });
    if (orgId) q = q.eq('org_id', orgId);
    const { data, error } = await q;
    if (error) return NextResponse.json({ success: true, employees: memEmployees, _fallback: true });
    return NextResponse.json({ success: true, employees: data });
  } catch (e: any) {
    return NextResponse.json({ success: true, employees: memEmployees, _fallback: true });
  }
}

export async function POST(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    const body = await req.json();
    const code = (body.code || '').toString().trim();
    const name = (body.name || '').toString().trim();
    const department = body.department?.toString().trim() || null;

    if (!code || !name) {
      return NextResponse.json({ success: false, error: 'តម្រូវឱ្យមាន Employee ID និងឈ្មោះ' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('employees')
      .insert({ code, name, department, org_id: orgId, active: true, enrolled: false })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: false, error: 'Employee ID នេះមានរួចហើយ' }, { status: 409 });
      }
      if (memEmployees.some((e) => e.code === code)) {
        return NextResponse.json({ success: false, error: 'Employee ID នេះមានរួចហើយ' }, { status: 409 });
      }
      const rec: Employee = { id: code, code, name, department, active: true, enrolled: false, created_at: new Date().toISOString() };
      memEmployees.unshift(rec);
      return NextResponse.json({ success: true, employee: rec, _fallback: true });
    }

    return NextResponse.json({ success: true, employee: data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

// PATCH { code, ...fields } -> update an employee within the org
export async function PATCH(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    const b = await req.json();
    const code = (b.code || '').toString().trim();
    if (!code) return NextResponse.json({ success: false, error: 'Missing code' }, { status: 400 });

    const patch: Record<string, any> = {};
    if (b.name != null) patch.name = b.name;
    if (b.department !== undefined) patch.department = b.department || null;
    if (b.pay_type != null) patch.pay_type = b.pay_type === 'hourly' ? 'hourly' : 'monthly';
    if (b.base_salary != null) patch.base_salary = Number(b.base_salary) || 0;
    if (b.hourly_rate != null) patch.hourly_rate = Number(b.hourly_rate) || 0;
    if (b.work_schedule !== undefined) patch.work_schedule = b.work_schedule;
    if (b.active != null) patch.active = !!b.active;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    let q = supabase.from('employees').update(patch).eq('code', code);
    if (orgId) q = q.eq('org_id', orgId);
    const { data, error } = await q.select().single();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, employee: data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    const code = new URL(req.url).searchParams.get('code');
    if (!code) return NextResponse.json({ success: false, error: 'Missing code' }, { status: 400 });

    let dq = supabase.from('employees').delete().eq('code', code);
    if (orgId) dq = dq.eq('org_id', orgId);
    const { error } = await dq;
    if (error) memEmployees = memEmployees.filter((e) => e.code !== code);

    // also remove their face enrollment (same org)
    let fq = supabase.from('face_enrollments').delete().eq('user_id', code);
    if (orgId) fq = fq.eq('org_id', orgId);
    await fq.then(() => {}, () => {});

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
