import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { buildPayrollReport } from '@/lib/payrollServer';
import { currentMonth, currentDayOfMonth, formatPayslip, DEFAULT_SETTINGS } from '@/lib/payroll';
import { sendTelegram, ADMIN_GROUP_ID } from '@/lib/telegram';

// Daily Vercel Cron. For EACH organization, sends payslips when today is that
// org's configured payday. Add ?force=1 to send for all orgs immediately.
export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get('authorization');
      if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const force = new URL(req.url).searchParams.get('force') === '1';
    const month = currentMonth();
    const today = currentDayOfMonth();

    // All active orgs (fallback to a single null org if table missing)
    let orgs: { id: string | null; payroll: any }[] = [];
    try {
      const { data } = await supabase.from('organizations').select('id, payroll, active');
      orgs = (data || []).filter((o: any) => o.active !== false);
    } catch { /* ignore */ }
    if (orgs.length === 0) orgs = [{ id: null, payroll: null }];

    const summary: any[] = [];
    for (const org of orgs) {
      const payday = Number(org.payroll?.payday ?? DEFAULT_SETTINGS.payday);
      if (!force && today !== payday) { summary.push({ org: org.id, skipped: true, payday }); continue; }

      const { rows, settings } = await buildPayrollReport(month, org.id);
      let sent = 0, skipped = 0;
      for (const row of rows) {
        const tg = (row.emp as any).telegram_id;
        if (!tg) { skipped++; continue; }
        const ok = await sendTelegram(tg, formatPayslip(row.emp, row.report, row.salary, month, settings));
        if (ok) sent++; else skipped++;
      }
      summary.push({ org: org.id, sent, skipped, total: rows.length });
    }

    if (ADMIN_GROUP_ID) {
      const totalSent = summary.reduce((s, x) => s + (x.sent || 0), 0);
      await sendTelegram(ADMIN_GROUP_ID, `📤 *Payslip ខែ ${month}* — ផ្ញើសរុប ✅ ${totalSent} នាក់ (${summary.length} org)`);
    }

    return NextResponse.json({ ok: true, month, today, summary });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
