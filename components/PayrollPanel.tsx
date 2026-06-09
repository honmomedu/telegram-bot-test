'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, Download, Send, Plus, Minus, Settings2, X, DollarSign, CheckCircle2, Sparkles, Clock, Trash2 } from 'lucide-react';

interface Row {
  code: string; name: string; department: string | null;
  payType: 'monthly' | 'hourly'; baseSalary: number; hourlyRate: number;
  telegramLinked: boolean; daysPresent: number; lateCount: number; totalHours: number; absentDays: number;
  gross: number; additions: number; deductions: number; lateDeduction: number; absentDeduction: number; net: number;
}
interface Settings {
  work_start_time: string; work_end_time: string; late_threshold_min: number; standard_days: number;
  late_deduction: number; absent_deduction: number; currency: string; payday: number;
}

function thisMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }

export default function PayrollPanel() {
  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState<Row[]>([]);
  const [currency, setCurrency] = useState('USD');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [adjFor, setAdjFor] = useState<Row | null>(null);
  const [timesheetFor, setTimesheetFor] = useState<Row | null>(null);

  const sym = (n: number) => currency === 'KHR' ? `${Math.round(n).toLocaleString()}៛` : `$${n.toFixed(2)}`;

  const load = useCallback((m: string) => {
    setLoading(true);
    fetch(`/api/payroll/report?month=${m}`).then((r) => r.json()).then((d) => {
      setRows(d.rows || []);
      setCurrency(d.currency || 'USD');
      setSettings(d.settings || null);
    }).catch(() => setRows([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(month); }, [month, load]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const patchEmployee = async (code: string, fields: Record<string, any>) => {
    await fetch('/api/employees', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, ...fields }) });
    load(month);
  };

  const saveSettings = async () => {
    if (!settings) return;
    await fetch('/api/payroll/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    flash('បានរក្សាទុកការកំណត់ Payroll');
    load(month);
  };

  const sendPayslip = async (code?: string) => {
    setSending(code || 'all');
    try {
      const res = await fetch('/api/payroll/payslip', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(code ? { month, code } : { month, sendAll: true }),
      });
      const d = await res.json();
      flash(`ផ្ញើ Payslip៖ ✅ ${d.sent} នាក់ · ⏭ រំលង ${d.skipped} នាក់`);
    } catch { flash('មានបញ្ហាក្នុងការផ្ញើ'); }
    finally { setSending(null); }
  };

  const exportCSV = () => {
    const header = ['Code', 'Name', 'PayType', 'Days', 'Late', 'Hours', 'Gross', 'Add', 'Deduct', 'LateDed', 'AbsentDed', 'Net'];
    const lines = rows.map((r) => [r.code, r.name, r.payType, r.daysPresent, r.lateCount, r.totalHours, r.gross, r.additions, r.deductions, r.lateDeduction, r.absentDeduction, r.net].join(','));
    const blob = new Blob(['﻿' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `payroll-${month}.csv`; a.click();
  };

  const totalNet = rows.reduce((s, r) => s + r.net, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">ប្រាក់ខែ (Payroll)</h2>
          <p className="text-slate-500 mt-1">គណនាប្រាក់ខែ · កែតម្រូវ · ផ្ញើ Payslip តាម Telegram</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm" />
          <button onClick={() => setShowSettings((s) => !s)} className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"><Settings2 size={16} /> កំណត់</button>
          <button onClick={exportCSV} disabled={!rows.length} className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"><Download size={16} /> CSV</button>
        </div>
      </header>

      {/* Payroll settings */}
      {showSettings && settings && (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-5 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
          {[
            { k: 'work_start_time', label: 'ម៉ោងចូល', type: 'time' },
            { k: 'work_end_time', label: 'ម៉ោងចេញ', type: 'time' },
            { k: 'late_threshold_min', label: 'យឺត (នាទី)', type: 'number' },
            { k: 'standard_days', label: 'ថ្ងៃធ្វើការ/ខែ', type: 'number' },
            { k: 'late_deduction', label: 'កាត់/លើកយឺត', type: 'number' },
            { k: 'absent_deduction', label: 'កាត់/ថ្ងៃអវត្តមាន', type: 'number' },
            { k: 'payday', label: 'ថ្ងៃផ្ញើ Payslip', type: 'number' },
          ].map(({ k, label, type }) => (
            <div key={k}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
              <input type={type} value={(settings as any)[k]}
                onChange={(e) => setSettings({ ...settings, [k]: type === 'number' ? Number(e.target.value) : e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">រូបិយប័ណ្ណ</label>
            <select value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm">
              <option value="USD">USD ($)</option>
              <option value="KHR">KHR (៛)</option>
            </select>
          </div>
          <div className="col-span-2 md:col-span-4 flex justify-end">
            <button onClick={saveSettings} className="px-5 py-2 brand-gradient text-white rounded-xl text-sm font-semibold shadow-glow-brand">រក្សាទុក</button>
          </div>
        </div>
      )}

      {/* Total + send all */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-br from-brand-50 to-violet-50 border border-brand-100 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl brand-gradient flex items-center justify-center shadow-glow-brand"><DollarSign className="w-6 h-6 text-white" /></div>
          <div>
            <div className="text-xs text-slate-500">ប្រាក់ខែសុទ្ធសរុប · ខែ {month}</div>
            <div className="text-2xl font-bold text-slate-900">{sym(totalNet)}</div>
          </div>
        </div>
        <button onClick={() => sendPayslip()} disabled={sending !== null || !rows.length}
          className="flex items-center gap-2 px-5 py-2.5 brand-gradient disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-glow-brand active:scale-95 transition">
          {sending === 'all' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} ផ្ញើ Payslip ទាំងអស់
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-x-auto">
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-slate-400">មិនមានបុគ្គលិក — បន្ថែមនៅ tab "គ្រប់គ្រងបុគ្គលិក"</div>
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">បុគ្គលិក</th>
                <th className="text-center px-2 py-3 font-semibold">ប្រភេទ</th>
                <th className="text-center px-2 py-3 font-semibold">គោល/ម៉ោង</th>
                <th className="text-center px-2 py-3 font-semibold">ថ្ងៃ/យឺត</th>
                <th className="text-right px-2 py-3 font-semibold">Gross</th>
                <th className="text-right px-2 py-3 font-semibold">កែតម្រូវ</th>
                <th className="text-right px-3 py-3 font-semibold">សុទ្ធ</th>
                <th className="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.code} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">{r.name}
                      {r.telegramLinked ? <span title="ភ្ជាប់ Telegram" className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> : <span title="មិនទាន់ភ្ជាប់" className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                    </div>
                    <div className="text-xs text-slate-400">{r.code}</div>
                  </td>
                  <td className="text-center px-2 py-3">
                    <select value={r.payType} onChange={(e) => patchEmployee(r.code, { pay_type: e.target.value })}
                      className="text-xs border border-slate-200 rounded-lg px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                      <option value="monthly">ខែ</option>
                      <option value="hourly">ម៉ោង</option>
                    </select>
                  </td>
                  <td className="text-center px-2 py-3">
                    <input type="number" defaultValue={r.payType === 'hourly' ? r.hourlyRate : r.baseSalary}
                      onBlur={(e) => { const v = Number(e.target.value); const f = r.payType === 'hourly' ? { hourly_rate: v } : { base_salary: v }; patchEmployee(r.code, f); }}
                      className="w-20 text-right text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  </td>
                  <td className="text-center px-2 py-3 text-xs text-slate-600">{r.daysPresent}d · <span className={r.lateCount ? 'text-amber-600' : ''}>{r.lateCount}L</span></td>
                  <td className="text-right px-2 py-3 text-slate-600">{sym(r.gross)}</td>
                  <td className="text-right px-2 py-3 text-xs">
                    {r.additions ? <div className="text-emerald-600">+{sym(r.additions)}</div> : null}
                    {(r.deductions + r.lateDeduction + r.absentDeduction) ? <div className="text-red-500">-{sym(r.deductions + r.lateDeduction + r.absentDeduction)}</div> : null}
                    {!r.additions && !(r.deductions + r.lateDeduction + r.absentDeduction) ? <span className="text-slate-300">—</span> : null}
                  </td>
                  <td className="text-right px-3 py-3 font-bold text-slate-900">{sym(r.net)}</td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setTimesheetFor(r)} title="Timesheet (បញ្ចូលម៉ោងតាមថ្ងៃ)" className="p-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600"><Clock size={14} /></button>
                      <button onClick={() => setAdjFor(r)} title="កែតម្រូវ" className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"><Plus size={14} /></button>
                      <button onClick={() => sendPayslip(r.code)} disabled={sending !== null} title="ផ្ញើ Payslip" className="p-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-600 disabled:opacity-50">
                        {sending === r.code ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Adjustment modal */}
      {adjFor && <AdjustModal row={adjFor} month={month} sym={sym} onClose={() => setAdjFor(null)} onSaved={() => { setAdjFor(null); load(month); flash('បានបន្ថែមការកែតម្រូវ'); }} />}

      {/* Timesheet modal */}
      {timesheetFor && <TimesheetModal row={timesheetFor} month={month} onClose={() => setTimesheetFor(null)} onChanged={() => load(month)} />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-medium animate-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {toast}
        </div>
      )}
    </div>
  );
}

function AdjustModal({ row, month, sym, onClose, onSaved }: { row: Row; month: string; sym: (n: number) => string; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<'add' | 'deduct'>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState<any[]>([]);

  const loadList = useCallback(() => {
    fetch(`/api/payroll/adjustments?month=${month}&code=${row.code}`).then((r) => r.json()).then((d) => setList(d.adjustments || []));
  }, [month, row.code]);
  useEffect(() => { loadList(); }, [loadList]);

  const save = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    setSaving(true);
    await fetch('/api/payroll/adjustments', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_code: row.code, month, type, amount: amt, reason }) });
    setAmount(''); setReason(''); setSaving(false); loadList(); onSaved();
  };

  const del = async (id: string) => { await fetch(`/api/payroll/adjustments?id=${id}`, { method: 'DELETE' }); loadList(); onSaved(); };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Sparkles className="w-5 h-5 text-brand-500" /> កែតម្រូវប្រាក់ខែ</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">{row.name} ({row.code}) · ខែ {month}</p>

        <div className="flex gap-2 mb-3">
          <button onClick={() => setType('add')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition ${type === 'add' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}><Plus size={15} /> ថែម (Bonus)</button>
          <button onClick={() => setType('deduct')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition ${type === 'deduct' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500'}`}><Minus size={15} /> កាត់ (Deduct)</button>
        </div>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="ចំនួនទឹកប្រាក់"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm mb-2" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="មូលហេតុ (ឧ. ប្រាក់រង្វាន់, កាត់ច្បាប់)"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm mb-3" />
        <button onClick={save} disabled={saving || !amount} className="w-full brand-gradient disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-glow-brand active:scale-95 transition">
          {saving ? 'កំពុងរក្សាទុក...' : 'បន្ថែម'}
        </button>

        {list.length > 0 && (
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
            {list.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-xl px-3 py-2">
                <span className={a.type === 'add' ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                  {a.type === 'add' ? '+' : '-'}{sym(Number(a.amount))}
                </span>
                <span className="text-xs text-slate-500 flex-1 px-2 truncate">{a.reason || ''}</span>
                <button onClick={() => del(a.id)} className="text-slate-400 hover:text-red-500"><X size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TimesheetModal({ row, month, onClose, onChanged }: { row: Row; month: string; onClose: () => void; onChanged: () => void }) {
  const [date, setDate] = useState(`${month}-01`);
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState<any[]>([]);

  const loadList = useCallback(() => {
    fetch(`/api/payroll/manual-hours?month=${month}&code=${row.code}`).then((r) => r.json()).then((d) => setList(d.entries || []));
  }, [month, row.code]);
  useEffect(() => { loadList(); }, [loadList]);

  const save = async () => {
    const h = Number(hours);
    if (isNaN(h) || h < 0 || !date.startsWith(month)) return;
    setSaving(true);
    await fetch('/api/payroll/manual-hours', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_code: row.code, work_date: date, hours: h, note }) });
    setHours(''); setNote(''); setSaving(false); loadList(); onChanged();
  };

  const del = async (id: string) => { await fetch(`/api/payroll/manual-hours?id=${id}`, { method: 'DELETE' }); loadList(); onChanged(); };

  const total = list.reduce((s, e) => s + Number(e.hours || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Clock className="w-5 h-5 text-violet-500" /> Timesheet (បញ្ចូលម៉ោង)</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">{row.name} ({row.code}) · ខែ {month}{row.payType === 'hourly' ? ` · $${row.hourlyRate}/ម៉ោង` : ''}</p>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">ថ្ងៃ</label>
            <input type="date" value={date} min={`${month}-01`} max={`${month}-31`} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">ម៉ោង</label>
            <input type="number" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="ឧ. 3"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm" />
          </div>
        </div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="កំណត់ចំណាំ (ស្រេចចិត្ត)"
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm mb-3" />
        <button onClick={save} disabled={saving || hours === ''} className="w-full brand-gradient disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-glow-brand active:scale-95 transition">
          {saving ? 'កំពុងរក្សាទុក...' : 'រក្សាទុកម៉ោងថ្ងៃនេះ'}
        </button>

        <div className="mt-4 flex items-center justify-between text-sm font-semibold text-slate-700">
          <span>ម៉ោងសរុបក្នុងខែ</span><span className="text-violet-600">{Math.round(total * 100) / 100}h</span>
        </div>
        {list.length > 0 && (
          <div className="mt-2 space-y-2 max-h-44 overflow-y-auto">
            {list.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-xl px-3 py-2">
                <span className="font-semibold text-slate-700">{e.work_date.slice(5)}</span>
                <span className="text-violet-600 font-semibold">{e.hours}h</span>
                <span className="text-xs text-slate-500 flex-1 px-2 truncate text-right">{e.note || ''}</span>
                <button onClick={() => del(e.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">ម៉ោងដែលបញ្ចូលនៅទីនេះ នឹង override ម៉ោងគិតពី IN/OUT សម្រាប់ថ្ងៃនោះ (សម្រាប់បុគ្គលិក part-time / កែតម្រូវ)។</p>
      </div>
    </div>
  );
}
