import { supabase } from './supabase';
import {
  AttRecord, EmployeeLite, PayrollSettings, Adjustment, DEFAULT_SETTINGS, ManualHour,
  buildReport, computeSalary, monthRange, AttendanceReport, SalaryResult,
} from './payroll';

export async function loadSettings(): Promise<PayrollSettings> {
  try {
    const { data } = await supabase.from('payroll_settings').select('*').eq('id', 1).single();
    if (data) return { ...DEFAULT_SETTINGS, ...data };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

export async function loadEmployees(): Promise<EmployeeLite[]> {
  try {
    const { data } = await supabase
      .from('employees')
      .select('code, name, department, pay_type, base_salary, hourly_rate, telegram_id, active')
      .order('code');
    return (data || []).filter((e: any) => e.active !== false) as EmployeeLite[];
  } catch {
    return [];
  }
}

/** Fetch ALL attendance rows for a month, paginating past the 1000-row cap. */
export async function loadAttendanceForMonth(month: string): Promise<AttRecord[]> {
  const { start, end } = monthRange(month);
  const out: AttRecord[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('employee_code, type, created_at')
        .gte('created_at', start)
        .lt('created_at', end)
        .order('created_at', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      out.push(...(data as AttRecord[]));
      if (data.length < PAGE) break;
    } catch {
      break;
    }
  }
  return out;
}

export async function loadManualHours(month: string): Promise<Map<string, Map<string, ManualHour>>> {
  const map = new Map<string, Map<string, ManualHour>>();
  try {
    const { data } = await supabase
      .from('manual_hours')
      .select('employee_code, work_date, hours, note')
      .like('work_date', `${month}-%`);
    for (const m of data || []) {
      const inner = map.get(m.employee_code) || new Map<string, ManualHour>();
      inner.set(m.work_date, { hours: Number(m.hours || 0), note: m.note });
      map.set(m.employee_code, inner);
    }
  } catch { /* ignore */ }
  return map;
}

export async function loadAdjustments(month: string): Promise<Map<string, Adjustment[]>> {
  const map = new Map<string, Adjustment[]>();
  try {
    const { data } = await supabase
      .from('payroll_adjustments')
      .select('employee_code, type, amount, reason')
      .eq('month', month);
    for (const a of data || []) {
      const list = map.get(a.employee_code) || [];
      list.push({ type: a.type, amount: a.amount, reason: a.reason });
      map.set(a.employee_code, list);
    }
  } catch { /* ignore */ }
  return map;
}

export interface PayrollRow {
  emp: EmployeeLite & { telegram_id?: number | null };
  report: AttendanceReport;
  salary: SalaryResult;
}

/** Build the full payroll report for a month (all active employees). */
export async function buildPayrollReport(month: string): Promise<{ rows: PayrollRow[]; settings: PayrollSettings }> {
  const [settings, employees, attendance, adjMap, manualMap] = await Promise.all([
    loadSettings(),
    loadEmployees(),
    loadAttendanceForMonth(month),
    loadAdjustments(month),
    loadManualHours(month),
  ]);

  const byEmp = new Map<string, AttRecord[]>();
  for (const r of attendance) {
    const list = byEmp.get(r.employee_code) || [];
    list.push(r);
    byEmp.set(r.employee_code, list);
  }

  const rows: PayrollRow[] = employees.map((emp) => {
    const report = buildReport(emp.code, byEmp.get(emp.code) || [], settings, manualMap.get(emp.code));
    const salary = computeSalary(emp, report, settings, adjMap.get(emp.code) || []);
    return { emp, report, salary };
  });

  return { rows, settings };
}
