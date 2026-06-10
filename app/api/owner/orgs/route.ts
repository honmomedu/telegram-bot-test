import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'owner123';

function authed(req: Request) {
  return (req.headers.get('x-owner-key') || '') === OWNER_PASSWORD;
}

const DEFAULT_METHODS = { face: true, office_qr: true, qr_card: false, nfc: false, manual: false };

export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, slug, name, active, attendance_methods, admin_password, created_at')
      .order('created_at', { ascending: true });
    if (error) return NextResponse.json({ success: true, orgs: [], _fallback: true });

    // Include employee counts (best effort)
    const orgs = data || [];
    return NextResponse.json({ success: true, orgs });
  } catch (e: any) {
    return NextResponse.json({ success: true, orgs: [], _fallback: true });
  }
}

export async function POST(req: Request) {
  if (!authed(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const b = await req.json();
    const slug = (b.slug || '').toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const name = (b.name || '').toString().trim();
    if (!slug || !name) return NextResponse.json({ success: false, error: 'តម្រូវ slug និងឈ្មោះ' }, { status: 400 });

    const { data, error } = await supabase
      .from('organizations')
      .insert({
        slug,
        name,
        admin_password: b.admin_password || 'admin123',
        attendance_methods: b.attendance_methods || DEFAULT_METHODS,
        active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ success: false, error: 'slug នេះមានរួចហើយ' }, { status: 409 });
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, org: data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!authed(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const b = await req.json();
    const id = b.id;
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    const patch: Record<string, any> = {};
    if (b.name != null) patch.name = b.name;
    if (b.admin_password) patch.admin_password = b.admin_password;
    if (b.active != null) patch.active = !!b.active;
    if (b.attendance_methods != null) patch.attendance_methods = b.attendance_methods;
    const { data, error } = await supabase.from('organizations').update(patch).eq('id', id).select().single();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, org: data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!authed(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    await supabase.from('organizations').delete().eq('id', id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
