import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { orgIdFromReq } from '@/lib/org';

// Cloud storage of face enrollments, scoped per organization.

export async function GET(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    const userId = new URL(req.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }

    let gq = supabase
      .from('face_enrollments')
      .select('user_id, name, descriptor, photo, created_at')
      .eq('user_id', userId);
    if (orgId) gq = gq.eq('org_id', orgId);
    const { data, error } = await gq.single();

    if (error || !data) {
      return NextResponse.json({ success: true, enrollment: null, _fallback: true });
    }

    return NextResponse.json({ success: true, enrollment: data });
  } catch (error: any) {
    return NextResponse.json({ success: true, enrollment: null, _fallback: true, error: error?.message });
  }
}

export async function POST(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    const body = await req.json();
    const { userId, name, descriptor, photo } = body;

    if (!userId || !Array.isArray(descriptor) || descriptor.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const { error } = await supabase.from('face_enrollments').upsert(
      {
        user_id: userId,
        org_id: orgId,
        name: name || null,
        descriptor,
        photo: photo || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,user_id' },
    );

    if (error) {
      // Table likely not created yet — tell the client to keep the local copy.
      return NextResponse.json({ success: true, savedToCloud: false, reason: error.message });
    }

    // Mark the employee as enrolled (best effort, same org).
    {
      let mq = supabase.from('employees').update({ enrolled: true }).eq('code', userId);
      if (orgId) mq = mq.eq('org_id', orgId);
      await mq.then(() => {}, () => {});
    }

    return NextResponse.json({ success: true, savedToCloud: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    const userId = new URL(req.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }
    let dq = supabase.from('face_enrollments').delete().eq('user_id', userId);
    if (orgId) dq = dq.eq('org_id', orgId);
    const { error } = await dq;
    return NextResponse.json({ success: true, deletedFromCloud: !error });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
