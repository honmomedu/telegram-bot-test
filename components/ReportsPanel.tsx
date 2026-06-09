'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, Download, CalendarDays, Clock, Users, AlertTriangle, ChevronDown } from 'lucide-react';

interface Row {
  code: string; name: string; department: string | null;
  daysPresent: number; lateCount: number; totalHours: number; absentDays: number;
  days: { date: string; firstIn: string | null; lastOut: string | null; hours: number; late: boolean }[];
}

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ReportsPanel() {
  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback((m: string) => {
    setLoading(true);
    fetch(`/api/payroll/report?month=${m}`)
      .then((r) => r.json())
      .then((d) => setRows(d.rows || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(month); }, [month, load]);

  const totals = rows.reduce(
    (a, r) => ({ present: a.present + r.daysPresent, late: a.late + r.lateCount, hours: a.hours + r.totalHours }),
    { present: 0, late: 0, hours: 0 },
  );

  const exportCSV = () => {
    const header = ['Code', 'Name', 'Department', 'DaysPresent', 'Late', 'TotalHours', 'AbsentDays'];
    const lines = rows.map((r) => [r.code, r.name, r.department || '', r.daysPresent, r.lateCount, r.totalHours, r.absentDays].join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${month}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">របាយការណ៍វត្តមាន</h2>
          <p className="text-slate-500 mt-1">សង្ខេបវត្តមានបុគ្គលិកប្រចាំខែ</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm" />
          <button onClick={exportCSV} disabled={!rows.length}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition">
            <Download size={16} /> CSV
          </button>
        </div>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: 'បុគ្គលិក', value: rows.length, color: 'text-brand-600' },
          { icon: CalendarDays, label: 'ថ្ងៃមកធ្វើការ (សរុប)', value: totals.present, color: 'text-emerald-600' },
          { icon: AlertTriangle, label: 'យឺត (សរុប)', value: totals.late, color: 'text-amber-600' },
          { icon: Clock, label: 'ម៉ោងធ្វើការ (សរុប)', value: `${Math.round(totals.hours)}h`, color: 'text-violet-600' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl shadow-card border border-slate-100 p-4">
            <Icon className={`w-5 h-5 ${color}`} />
            <div className="text-2xl font-bold text-slate-900 mt-2">{value}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-slate-400">មិនមានទិន្នន័យសម្រាប់ខែនេះ</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">បុគ្គលិក</th>
                <th className="text-center px-3 py-3 font-semibold">ថ្ងៃ</th>
                <th className="text-center px-3 py-3 font-semibold">យឺត</th>
                <th className="text-center px-3 py-3 font-semibold">ម៉ោង</th>
                <th className="text-center px-3 py-3 font-semibold">អវត្តមាន</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <React.Fragment key={r.code}>
                  <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpanded(expanded === r.code ? null : r.code)}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{r.name}</div>
                      <div className="text-xs text-slate-400">{r.code}{r.department ? ` · ${r.department}` : ''}</div>
                    </td>
                    <td className="text-center px-3 py-3 font-medium">{r.daysPresent}</td>
                    <td className="text-center px-3 py-3"><span className={r.lateCount ? 'text-amber-600 font-semibold' : 'text-slate-400'}>{r.lateCount}</span></td>
                    <td className="text-center px-3 py-3 text-slate-600">{r.totalHours}h</td>
                    <td className="text-center px-3 py-3"><span className={r.absentDays ? 'text-red-500 font-semibold' : 'text-slate-400'}>{r.absentDays}</span></td>
                    <td className="px-2"><ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded === r.code ? 'rotate-180' : ''}`} /></td>
                  </tr>
                  {expanded === r.code && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {r.days.length === 0 ? <span className="text-xs text-slate-400">គ្មានកំណត់ត្រា</span> : r.days.map((d) => (
                            <div key={d.date} className="text-xs bg-white rounded-lg border border-slate-100 px-2.5 py-1.5">
                              <div className="font-semibold text-slate-700">{d.date.slice(5)}</div>
                              <div className="text-slate-500">{d.firstIn || '--'} → {d.lastOut || '--'} {d.late && <span className="text-amber-600">⚠</span>}</div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
