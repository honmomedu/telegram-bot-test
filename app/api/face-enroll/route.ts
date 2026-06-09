import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Cloud storage of face enrollments. Degrades gracefully when the
// `face_enrollments` table does not exist yet (mirrors office-config),
// so the feature works on localStorage alone until the SQL is applied.

export async function GET(req: Request) {
  try {
    const userId = new URL(req.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('face_enrollments')
      .select('user_id, name, descriptor, photo, created_at')
      .eq('user_id', userId)
      .single();

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
    const body = await req.json();
    const { userId, name, descriptor, photo } = body;

    if (!userId || !Array.isArray(descriptor) || descriptor.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const { error } = await supabase.from('face_enrollments').upsert(
      {
        user_id: userId,
        name: name || null,
        descriptor,
        photo: photo || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (error) {
      // Table likely not created yet — tell the client to keep the local copy.
      return NextResponse.json({ success: true, savedToCloud: false, reason: error.message });
    }

    // Mark the employee as enrolled (best effort).
    await supabase.from('employees').update({ enrolled: true }).eq('code', userId).then(() => {}, () => {});

    return NextResponse.json({ success: true, savedToCloud: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = new URL(req.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }
    const { error } = await supabase.from('face_enrollments').delete().eq('user_id', userId);
    return NextResponse.json({ success: true, deletedFromCloud: !error });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
