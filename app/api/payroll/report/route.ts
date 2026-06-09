import { NextResponse } from 'next/server';
import { buildPayrollReport } from '@/lib/payrollServer';
import { currentMonth } from '@/lib/payroll';

// GET ?month=YYYY-MM -> per-employee attendance summary + computed salary
export async function GET(req: Request) {
  try {
    const month = new URL(req.url).searchParams.get('month') || currentMonth();
    const { rows, settings } = await buildPayrollReport(month);

    const data = rows.map(({ emp, report, salary }) => ({
      code: emp.code,
      name: emp.name,
      department: emp.department || null,
      payType: salary.payType,
      baseSalary: Number(emp.base_salary || 0),
      hourlyRate: Number(emp.hourly_rate || 0),
      workSchedule: emp.work_schedule || null,
      telegramLinked: (emp as any).telegram_id != null,
      daysPresent: report.daysPresent,
      lateCount: report.lateCount,
      totalHours: report.totalHours,
      absentDays: salary.absentDays,
      gross: salary.gross,
      additions: salary.additions,
      deductions: salary.deductions,
      lateDeduction: salary.lateDeduction,
      absentDeduction: salary.absentDeduction,
      net: salary.net,
      days: report.days,
    }));

    return NextResponse.json({ success: true, month, currency: settings.currency, settings, rows: data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message, rows: [] }, { status: 500 });
  }
}
