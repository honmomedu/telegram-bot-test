import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { orgIdFromReq } from '@/lib/org';

// Office QR secret, stored per-organization in organizations.qr_secret.
const LEGACY_SECRET = 'SECURE_ATTEND_OFFICE_QR_2026';
let memSecret: string | null = null;

function genSecret() {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `SECATT-OFFICE-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

export async function GET(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    if (orgId) {
      const { data } = await supabase.from('organizations').select('qr_secret').eq('id', orgId).single();
      if (data?.qr_secret) {
        return NextResponse.json({ success: true, secret: data.qr_secret, validSecrets: [data.qr_secret, LEGACY_SECRET] });
      }
    }
    const secret = memSecret || LEGACY_SECRET;
    return NextResponse.json({ success: true, secret, validSecrets: [secret, LEGACY_SECRET], _fallback: true });
  } catch {
    const secret = memSecret || LEGACY_SECRET;
    return NextResponse.json({ success: true, secret, validSecrets: [secret, LEGACY_SECRET], _fallback: true });
  }
}

export async function POST(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    const body = await req.json().catch(() => ({}));
    const secret: string = body.regenerate || !body.secret ? genSecret() : body.secret;
    const label: string = body.label || 'ការិយាល័យ';
    memSecret = secret;

    if (orgId) {
      const { error } = await supabase.from('organizations').update({ qr_secret: secret }).eq('id', orgId);
      if (!error) return NextResponse.json({ success: true, secret, label, savedToCloud: true });
    }
    return NextResponse.json({ success: true, secret, label, savedToCloud: false });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
