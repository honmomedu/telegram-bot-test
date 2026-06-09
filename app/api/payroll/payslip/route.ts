import { NextResponse } from 'next/server';
import { buildPayrollReport, PayrollRow } from '@/lib/payrollServer';
import { currentMonth, formatPayslip } from '@/lib/payroll';
import { sendTelegram } from '@/lib/telegram';

// POST { month?, code?, sendAll? } -> send payslip(s) via Telegram DM
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const month = body.month || currentMonth();
    const { rows, settings } = await buildPayrollReport(month);

    let targets: PayrollRow[];
    if (body.sendAll) {
      targets = rows;
    } else if (body.code) {
      targets = rows.filter((r) => r.emp.code === body.code);
    } else {
      return NextResponse.json({ success: false, error: 'Missing code or sendAll' }, { status: 400 });
    }

    let sent = 0;
    let skipped = 0;
    const results: { code: string; sent: boolean; reason?: string }[] = [];
    for (const row of targets) {
      const tg = (row.emp as any).telegram_id;
      if (!tg) {
        skipped++;
        results.push({ code: row.emp.code, sent: false, reason: 'no-telegram' });
        continue;
      }
      const ok = await sendTelegram(tg, formatPayslip(row.emp, row.report, row.salary, month, settings));
      if (ok) sent++; else skipped++;
      results.push({ code: row.emp.code, sent: ok });
    }

    return NextResponse.json({ success: true, month, sent, skipped, total: targets.length, results });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
