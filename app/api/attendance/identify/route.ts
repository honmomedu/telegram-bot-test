import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { orgIdFromReq } from '@/lib/org';

// Face auto-match: given a captured descriptor, find which enrolled employee
// it belongs to by comparing against every stored face descriptor server-side.
// POST { descriptor: number[] } -> { matched, code, name, confidence }

const MATCH_THRESHOLD = 0.5; // must agree with lib/face.ts

function euclidean(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return Number.POSITIVE_INFINITY;
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

export async function POST(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    const { descriptor } = await req.json();
    if (!Array.isArray(descriptor) || descriptor.length === 0) {
      return NextResponse.json({ matched: false, error: 'Invalid descriptor' }, { status: 400 });
    }

    let fq = supabase.from('face_enrollments').select('user_id, name, descriptor');
    if (orgId) fq = fq.eq('org_id', orgId);
    const { data: faces, error } = await fq;

    if (error || !faces || faces.length === 0) {
      return NextResponse.json({ matched: false, reason: 'no-enrollments' });
    }

    let best: { code: string; name: string; dist: number } | null = null;
    for (const f of faces as any[]) {
      const d = euclidean(descriptor, f.descriptor as number[]);
      if (!best || d < best.dist) {
        best = { code: f.user_id, name: f.name || '', dist: d };
      }
    }

    if (!best || best.dist >= MATCH_THRESHOLD) {
      return NextResponse.json({ matched: false });
    }

    // Confirm the matched code maps to an active employee (best effort).
    let name = best.name;
    try {
      let eq = supabase.from('employees').select('name, active').eq('code', best.code);
      if (orgId) eq = eq.eq('org_id', orgId);
      const { data: emp } = await eq.single();
      if (emp) {
        if (emp.active === false) {
          return NextResponse.json({ matched: false, reason: 'inactive' });
        }
        name = emp.name || name;
      }
    } catch {
      /* employees table optional */
    }

    const confidence = Math.round(Math.max(0, Math.min(1, 1 - best.dist / (MATCH_THRESHOLD * 2))) * 100);
    return NextResponse.json({ matched: true, code: best.code, name, confidence });
  } catch (e: any) {
    return NextResponse.json({ matched: false, error: e?.message }, { status: 500 });
  }
}
