import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { orgIdFromReq } from '@/lib/org';
import { verifyCardPayload } from '@/lib/cardToken';
import { sendTelegram, ADMIN_GROUP_ID } from '@/lib/telegram';
import { TZ } from '@/lib/payroll';

// One-call kiosk check-in for a USB NFC/RFID reader station.
// POST { nfc?, card?, mode: 'IN'|'OUT'|'auto' } -> identify + record + notify
function startOfTodayISO(): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const o: Record<string, string> = {};
  for (const x of p) o[x.type] = x.value;
  return new Date(`${o.year}-${o.month}-${o.day}T00:00:00+07:00`).toISOString();
}

export async function POST(req: Request) {
  try {
    const orgId = await orgIdFromReq(req);
    const body = await req.json();
    const mode = body.mode === 'OUT' ? 'OUT' : body.mode === 'auto' ? 'auto' : 'IN';

    // --- Resolve employee from NFC serial or QR card ---
    let code: string | null = null;
    if (body.nfc) {
      let q = supabase.from('employees').select('code, name, telegram_id, active').eq('nfc_id', body.nfc.toString());
      if (orgId) q = q.eq('org_id', orgId);
      const { data } = await q.single();
      if (data && data.active !== false) return await record(data, orgId, mode);
      return NextResponse.json({ matched: false });
    }
    if (body.card) {
      let secret = '';
      if (orgId) {
        const { data: org } = await supabase.from('organizations').select('qr_secret').eq('id', orgId).single();
        secret = org?.qr_secret || '';
      }
      code = verifyCardPayload(body.card.toString(), secret);
      if (!code) return NextResponse.json({ matched: false, reason: 'invalid-card' });
      let q = supabase.from('employees').select('code, name, telegram_id, active').eq('code', code);
      if (orgId) q = q.eq('org_id', orgId);
      const { data } = await q.single();
      if (data && data.active !== false) return await record(data, orgId, mode);
      return NextResponse.json({ matched: false });
    }

    return NextResponse.json({ matched: false, error: 'Missing nfc or card' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ matched: false, error: e?.message }, { status: 500 });
  }
}

async function record(emp: any, orgId: string | null, mode: 'IN' | 'OUT' | 'auto') {
  let type: 'IN' | 'OUT' = mode === 'OUT' ? 'OUT' : 'IN';

  // Auto: toggle based on the employee's last record today
  if (mode === 'auto') {
    try {
      let lq = supabase
        .from('attendance')
        .select('type')
        .eq('employee_code', emp.code)
        .gte('created_at', startOfTodayISO())
        .order('created_at', { ascending: false })
        .limit(1);
      if (orgId) lq = lq.eq('org_id', orgId);
      const { data } = await lq;
      type = data && data[0]?.type === 'IN' ? 'OUT' : 'IN';
    } catch { type = 'IN'; }
  }

  let savedAt = new Date().toISOString();
  try {
    const { data } = await supabase
      .from('attendance')
      .insert({ employee_code: emp.code, employee_name: emp.name, type, method: 'nfc', org_id: orgId })
      .select('created_at')
      .single();
    if (data?.created_at) savedAt = data.created_at;
  } catch { /* still notify */ }

  const timeStr = new Date(savedAt).toLocaleString('km-KH', { timeZone: TZ });
  const action = type === 'IN' ? 'ចូលធ្វើការ (Check IN)' : 'ចេញពីធ្វើការ (Check OUT)';
  if (ADMIN_GROUP_ID) {
    await sendTelegram(ADMIN_GROUP_ID, `🔔 *វត្តមាន (Kiosk)*\n👤 ${emp.name} (${emp.code})\n📍 ${action}\n⏱ ${timeStr}`);
  }
  if (emp.telegram_id) {
    await sendTelegram(emp.telegram_id, `✅ ${action}\n⏱ ${timeStr}\n\nសូមអរគុណ ${emp.name}! 🙏`);
  }

  return NextResponse.json({ matched: true, code: emp.code, name: emp.name, type, time: savedAt });
}
