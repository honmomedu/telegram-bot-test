import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Record an attendance event (server-side timestamp = anti-cheat) and notify
// both the admin group AND the employee's private Telegram (if linked).
// POST { code, name, type: 'IN'|'OUT', method, distance, confidence }
// GET  ?limit=50&code=EMP-001 -> recent records

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const GROUP_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_ADMIN_GROUP_ID || '';

async function sendTelegram(chatId: string | number, text: string) {
  if (!BOT_TOKEN || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const code = (body.code || '').toString().trim();
    const type = body.type === 'OUT' ? 'OUT' : 'IN';
    const method = body.method === 'qr' ? 'qr' : 'face';
    const distance = body.distance != null ? Number(body.distance) : null;
    const confidence = body.confidence != null ? Number(body.confidence) : null;

    if (!code) {
      return NextResponse.json({ success: false, error: 'Missing employee code' }, { status: 400 });
    }

    // Resolve the canonical employee name + telegram link.
    let name = (body.name || '').toString();
    let telegramId: number | null = null;
    try {
      const { data: emp } = await supabase
        .from('employees')
        .select('name, telegram_id, active')
        .eq('code', code)
        .single();
      if (emp) {
        if (emp.active === false) {
          return NextResponse.json({ success: false, error: 'Employee inactive' }, { status: 403 });
        }
        name = emp.name || name;
        telegramId = emp.telegram_id ?? null;
      }
    } catch {
      /* employees table optional */
    }

    // Persist with a SERVER timestamp (cannot be spoofed by the device).
    let savedAt = new Date().toISOString();
    try {
      const { data, error } = await supabase
        .from('attendance')
        .insert({ employee_code: code, employee_name: name, type, method, distance, confidence })
        .select('created_at')
        .single();
      if (!error && data?.created_at) savedAt = data.created_at;
    } catch {
      /* table optional — still notify */
    }

    // --- Notifications ---
    const timeStr = new Date(savedAt).toLocaleString('km-KH', { timeZone: 'Asia/Phnom_Penh' });
    const action = type === 'IN' ? 'ចូលធ្វើការ (Check IN)' : 'ចេញពីធ្វើការ (Check OUT)';
    const methodStr = method === 'qr' ? 'ស្កេន QR' : 'ផ្ទៀងផ្ទាត់មុខ (Face)';

    const groupMsg =
      `🔔 *ការជូនដំណឹងវត្តមាន*\n\n` +
      `👤 *បុគ្គលិក:* ${name || code}\n` +
      `🆔 *លេខ:* ${code}\n` +
      `📍 *សកម្មភាព:* ${action}\n` +
      `🔐 *វិធី:* ${methodStr}${confidence != null ? ` · ${confidence}%` : ''}\n` +
      `⏱ *ម៉ោង (server):* ${timeStr}` +
      (distance != null ? `\n🧭 *ចម្ងាយ:* ${distance}m` : '');

    const dmMsg =
      `✅ *កំណត់ត្រាវត្តមានជោគជ័យ*\n\n` +
      `${action}\n⏱ ${timeStr}\n\n` +
      `សូមអរគុណ ${name || ''}! 🙏`;

    const [groupSent, dmSent] = await Promise.all([
      GROUP_ID ? sendTelegram(GROUP_ID, groupMsg) : Promise.resolve(false),
      telegramId ? sendTelegram(telegramId, dmMsg) : Promise.resolve(false),
    ]);

    return NextResponse.json({ success: true, savedAt, name, groupSent, dmSent, telegramLinked: telegramId != null });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200);
    const code = url.searchParams.get('code');

    let q = supabase
      .from('attendance')
      .select('id, employee_code, employee_name, type, method, distance, confidence, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (code) q = q.eq('employee_code', code);

    const { data, error } = await q;
    if (error) return NextResponse.json({ success: true, records: [], _fallback: true });
    return NextResponse.json({ success: true, records: data });
  } catch (e: any) {
    return NextResponse.json({ success: true, records: [], _fallback: true });
  }
}
