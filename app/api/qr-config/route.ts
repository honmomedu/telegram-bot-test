import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Manages the office QR secret(s) that the attendance scanner validates
// against. Degrades to an in-memory store when the `qr_codes` table is
// absent, so production never breaks before the migration is applied.

// Legacy hard-coded value kept for backward compatibility with QR codes
// printed before this feature existed.
const LEGACY_SECRET = 'SECURE_ATTEND_OFFICE_QR_2026';

let memSecret: string | null = null;

function genSecret() {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `SECATT-OFFICE-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('qr_codes')
      .select('id, secret, label, updated_at')
      .eq('id', 'office')
      .single();

    if (error || !data) {
      const secret = memSecret || LEGACY_SECRET;
      return NextResponse.json({ success: true, secret, validSecrets: [secret, LEGACY_SECRET], _fallback: true });
    }

    return NextResponse.json({
      success: true,
      secret: data.secret,
      label: data.label,
      updatedAt: data.updated_at,
      validSecrets: [data.secret, LEGACY_SECRET],
    });
  } catch (error: any) {
    const secret = memSecret || LEGACY_SECRET;
    return NextResponse.json({ success: true, secret, validSecrets: [secret, LEGACY_SECRET], _fallback: true });
  }
}

// POST { regenerate?: boolean, secret?: string, label?: string }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const secret: string = body.regenerate || !body.secret ? genSecret() : body.secret;
    const label: string = body.label || 'ការិយាល័យ';

    memSecret = secret;

    const { error } = await supabase.from('qr_codes').upsert(
      { id: 'office', secret, label, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    );

    if (error) {
      return NextResponse.json({ success: true, secret, label, savedToCloud: false, reason: error.message });
    }

    return NextResponse.json({ success: true, secret, label, savedToCloud: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
