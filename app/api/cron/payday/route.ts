import { NextResponse } from 'next/server';
import { buildPayrollReport } from '@/lib/payrollServer';
import { currentMonth, currentDayOfMonth, formatPayslip } from '@/lib/payroll';
import { sendTelegram, ADMIN_GROUP_ID } from '@/lib/telegram';

// Called daily by Vercel Cron. Sends payslips only when today == payday.
// Add ?force=1 to send immediately (manual trigger / testing).
export async function GET(req: Request) {
  try {
    // Optional protection: if CRON_SECRET is set, require it.
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get('authorization');
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const force = new URL(req.url).searchParams.get('force') === '1';
    const month = currentMonth();
    const { rows, settings } = await buildPayrollReport(month);

    const today = currentDayOfMonth();
    if (!force && today !== settings.payday) {
      return NextResponse.json({ ok: true, skipped: true, today, payday: settings.payday });
    }

    let sent = 0;
    let skipped = 0;
    for (const row of rows) {
      const tg = (row.emp as any).telegram_id;
      if (!tg) { skipped++; continue; }
      const ok = await sendTelegram(tg, formatPayslip(row.emp, row.report, row.salary, month, settings));
      if (ok) sent++; else skipped++;
    }

    if (ADMIN_GROUP_ID) {
      await sendTelegram(ADMIN_GROUP_ID, `📤 *Payslip ខែ ${month}* ត្រូវបានផ្ញើ៖ ✅ ${sent} នាក់ · ⏭ រំលង ${skipped} នាក់`);
    }

    return NextResponse.json({ ok: true, month, sent, skipped, total: rows.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
