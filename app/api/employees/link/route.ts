import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Link a Telegram account to an employee so they receive private DM
// notifications. Called automatically when the app runs inside the
// Telegram Mini App (employee already activated by Employee ID).
// POST { code, telegramId }
export async function POST(req: Request) {
  try {
    const { code, telegramId } = await req.json();
    const c = (code || '').toString().trim();
    const tg = telegramId ? Number(telegramId) : null;

    if (!c || !tg) {
      return NextResponse.json({ success: false, error: 'Missing code or telegramId' }, { status: 400 });
    }

    const { error } = await supabase
      .from('employees')
      .update({ telegram_id: tg })
      .eq('code', c);

    if (error) {
      return NextResponse.json({ success: false, error: error.message });
    }
    return NextResponse.json({ success: true, linked: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
