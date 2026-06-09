// Pure attendance + payroll computation, shared by API routes.
// All times are interpreted in Cambodia time (Asia/Phnom_Penh, UTC+7, no DST).

export const TZ = 'Asia/Phnom_Penh';

export interface AttRecord {
  employee_code: string;
  type: 'IN' | 'OUT';
  created_at: string;
}

export interface PayrollSettings {
  work_start_time: string; // 'HH:MM'
  work_end_time: string;
  late_threshold_min: number;
  standard_days: number;
  late_deduction: number;
  absent_deduction: number;
  currency: string;
  payday: number;
}

export const DEFAULT_SETTINGS: PayrollSettings = {
  work_start_time: '08:00',
  work_end_time: '17:00',
  late_threshold_min: 15,
  standard_days: 26,
  late_deduction: 0,
  absent_deduction: 0,
  currency: 'USD',
  payday: 28,
};

export interface WeeklySchedule { mon: number; tue: number; wed: number; thu: number; fri: number; sat: number; sun: number }

export interface EmployeeLite {
  code: string;
  name: string;
  department?: string | null;
  pay_type?: string | null; // 'monthly' | 'hourly'
  base_salary?: number | null;
  hourly_rate?: number | null;
  work_schedule?: WeeklySchedule | null;
}

export interface DaySummary {
  date: string; // YYYY-MM-DD (local)
  firstIn: string | null; // HH:MM
  lastOut: string | null;
  hours: number;
  late: boolean;
  lateMinutes: number;
  manual: boolean; // hours entered manually (overrides auto)
  note?: string;
}

export interface ManualHour { hours: number; note?: string }

export interface AttendanceReport {
  code: string;
  daysPresent: number;
  lateCount: number;
  totalHours: number;
  days: DaySummary[];
}

// --- timezone helpers ---
function parts(d: Date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) p[part.type] = part.value;
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    hm: `${p.hour === '24' ? '00' : p.hour}:${p.minute}`,
    minutes: (p.hour === '24' ? 0 : parseInt(p.hour)) * 60 + parseInt(p.minute),
  };
}

function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Build a per-day attendance report for ONE employee.
 * Manual timesheet hours (if provided for a date) override the auto-computed
 * IN→OUT hours for that day — used for part-timers / corrections.
 */
export function buildReport(
  code: string,
  records: AttRecord[],
  settings: PayrollSettings,
  manual?: Map<string, ManualHour>,
): AttendanceReport {
  const startMin = hmToMinutes(settings.work_start_time) + (settings.late_threshold_min || 0);

  const byDay = new Map<string, { ins: number[]; outs: number[]; inHM: string[] }>();
  for (const r of records) {
    const p = parts(new Date(r.created_at));
    if (!byDay.has(p.date)) byDay.set(p.date, { ins: [], outs: [], inHM: [] });
    const slot = byDay.get(p.date)!;
    if (r.type === 'IN') { slot.ins.push(p.minutes); slot.inHM.push(p.hm); }
    else slot.outs.push(p.minutes);
  }

  // Union of dates that have attendance OR a manual entry.
  const allDates = new Set<string>([...byDay.keys(), ...(manual ? manual.keys() : [])]);

  const days: DaySummary[] = [];
  let lateCount = 0;
  let totalHours = 0;
  let daysPresent = 0;

  for (const date of [...allDates].sort((a, b) => a.localeCompare(b))) {
    const slot = byDay.get(date);
    const firstInMin = slot && slot.ins.length ? Math.min(...slot.ins) : null;
    const lastOutMin = slot && slot.outs.length ? Math.max(...slot.outs) : null;
    const firstInHM = firstInMin != null ? slot!.inHM[slot!.ins.indexOf(firstInMin)] : null;
    const lastOutHM = lastOutMin != null
      ? `${String(Math.floor(lastOutMin / 60)).padStart(2, '0')}:${String(lastOutMin % 60).padStart(2, '0')}`
      : null;

    const autoHours = firstInMin != null && lastOutMin != null
      ? Math.max(0, (lastOutMin - firstInMin) / 60)
      : 0;

    const man = manual?.get(date);
    const isManual = man != null;
    const hours = isManual ? Number(man!.hours || 0) : autoHours;
    totalHours += hours;

    const late = firstInMin != null && firstInMin > startMin;
    const lateMinutes = late ? firstInMin! - hmToMinutes(settings.work_start_time) : 0;
    if (late) lateCount++;

    const present = (firstInMin != null) || hours > 0;
    if (present) daysPresent++;

    days.push({
      date,
      firstIn: firstInHM,
      lastOut: lastOutHM,
      hours: Math.round(hours * 100) / 100,
      late,
      lateMinutes,
      manual: isManual,
      note: man?.note,
    });
  }

  return {
    code,
    daysPresent,
    lateCount,
    totalHours: Math.round(totalHours * 100) / 100,
    days,
  };
}

export interface SalaryResult {
  payType: 'monthly' | 'hourly';
  gross: number;
  additions: number;
  deductions: number;
  lateDeduction: number;
  absentDeduction: number;
  net: number;
  absentDays: number;
}

export interface Adjustment {
  type: 'add' | 'deduct';
  amount: number;
  reason?: string | null;
}

/** Compute net salary for an employee for a month. */
export function computeSalary(
  emp: EmployeeLite,
  report: AttendanceReport,
  settings: PayrollSettings,
  adjustments: Adjustment[],
): SalaryResult {
  const payType = (emp.pay_type === 'hourly' ? 'hourly' : 'monthly') as 'monthly' | 'hourly';
  const additions = adjustments.filter((a) => a.type === 'add').reduce((s, a) => s + Number(a.amount || 0), 0);
  const deductions = adjustments.filter((a) => a.type === 'deduct').reduce((s, a) => s + Number(a.amount || 0), 0);

  let gross: number;
  let absentDays = 0;
  let absentDeduction = 0;

  if (payType === 'hourly') {
    gross = Number(emp.hourly_rate || 0) * report.totalHours;
  } else {
    gross = Number(emp.base_salary || 0);
    absentDays = Math.max(0, (settings.standard_days || 0) - report.daysPresent);
    if (settings.absent_deduction > 0) {
      absentDeduction = settings.absent_deduction * absentDays;
    }
  }

  const lateDeduction = (settings.late_deduction || 0) * report.lateCount;
  const net = gross + additions - deductions - lateDeduction - absentDeduction;

  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    payType,
    gross: r2(gross),
    additions: r2(additions),
    deductions: r2(deductions),
    lateDeduction: r2(lateDeduction),
    absentDeduction: r2(absentDeduction),
    net: r2(net),
    absentDays,
  };
}

/** Format money with currency. */
export function fmtMoney(n: number, currency = 'USD'): string {
  const symbol = currency === 'KHR' ? '៛' : currency === 'USD' ? '$' : '';
  const v = (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: currency === 'KHR' ? 0 : 2, maximumFractionDigits: 2 });
  return currency === 'KHR' ? `${v}${symbol}` : `${symbol}${v}`;
}

/** Build a Telegram-friendly payslip message (Markdown). */
export function formatPayslip(
  emp: EmployeeLite,
  report: AttendanceReport,
  salary: SalaryResult,
  month: string,
  settings: PayrollSettings,
): string {
  const cur = settings.currency;
  const lines = [
    `🧾 *ប័ណ្ណប្រាក់ខែ (Payslip)*`,
    `📅 ខែ៖ ${month}`,
    ``,
    `👤 ${emp.name} (${emp.code})`,
    emp.department ? `🏢 ${emp.department}` : '',
    ``,
    `📊 *វត្តមាន*`,
    `• ថ្ងៃមកធ្វើការ៖ ${report.daysPresent}`,
    `• យឺត៖ ${report.lateCount} ដង`,
    salary.payType === 'hourly' ? `• ម៉ោងធ្វើការ៖ ${report.totalHours}h` : `• អវត្តមាន៖ ${salary.absentDays} ថ្ងៃ`,
    ``,
    `💰 *ប្រាក់ខែ*`,
    salary.payType === 'hourly'
      ? `• គិតតាមម៉ោង៖ ${fmtMoney(salary.gross, cur)}`
      : `• ប្រាក់ខែគោល៖ ${fmtMoney(salary.gross, cur)}`,
    salary.additions ? `• ➕ ថែម៖ ${fmtMoney(salary.additions, cur)}` : '',
    salary.deductions ? `• ➖ កាត់៖ ${fmtMoney(salary.deductions, cur)}` : '',
    salary.lateDeduction ? `• ⏰ កាត់យឺត៖ ${fmtMoney(salary.lateDeduction, cur)}` : '',
    salary.absentDeduction ? `• 🚫 កាត់អវត្តមាន៖ ${fmtMoney(salary.absentDeduction, cur)}` : '',
    ``,
    `🟢 *ប្រាក់ខែសុទ្ធ៖ ${fmtMoney(salary.net, cur)}*`,
    ``,
    `_SecureAttend — ប្រព័ន្ធគ្រប់គ្រងធនធានមនុស្ស_`,
  ];
  return lines.filter((l) => l !== '').join('\n');
}

/** Day-of-month (1-31) in Cambodia time. */
export function currentDayOfMonth(): number {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, day: '2-digit' }).formatToParts(new Date());
  const d = p.find((x) => x.type === 'day')?.value || '1';
  return parseInt(d, 10);
}

/** Month helpers */
export function monthRange(month: string): { start: string; end: string } {
  // month = 'YYYY-MM' -> UTC range covering the local month (approx, inclusive)
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, -7, 0, 0)).toISOString(); // local 00:00
  const end = new Date(Date.UTC(y, m, 1, -7, 0, 0)).toISOString();
  return { start, end };
}

export function currentMonth(): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const o: Record<string, string> = {};
  for (const x of p) o[x.type] = x.value;
  return `${o.year}-${o.month}`;
}
