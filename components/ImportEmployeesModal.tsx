'use client';
import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, Download, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ParsedRow { code: string; name: string; department: string; pay_type: string; base_salary: number; hourly_rate: number }

// Flexible header matching (English + Khmer)
const FIELD_SYNONYMS: Record<keyof ParsedRow, string[]> = {
  code: ['code', 'លេខ', 'លេខបុគ្គលិក', 'employeeid', 'employee id', 'id', 'អត្តលេខ'],
  name: ['name', 'ឈ្មោះ', 'fullname', 'employee name', 'ឈ្មោះបុគ្គលិក'],
  department: ['department', 'ផ្នែក', 'dept', 'មុខតំណែង'],
  pay_type: ['pay_type', 'paytype', 'ប្រភេទ', 'type', 'ប្រភេទប្រាក់ខែ'],
  base_salary: ['base_salary', 'salary', 'ប្រាក់ខែ', 'ប្រាក់ខែគោល', 'basesalary'],
  hourly_rate: ['hourly_rate', 'rate', 'ប្រាក់ម៉ោង', 'តម្លៃម៉ោង', 'hourlyrate'],
};

function norm(s: any) { return (s ?? '').toString().trim().toLowerCase().replace(/\s+/g, ''); }

function mapRow(raw: Record<string, any>): ParsedRow {
  const keys = Object.keys(raw);
  const find = (field: keyof ParsedRow) => {
    const syn = FIELD_SYNONYMS[field].map(norm);
    const key = keys.find((k) => syn.includes(norm(k)));
    return key != null ? raw[key] : '';
  };
  const payRaw = norm(find('pay_type'));
  const pay_type = payRaw.includes('hour') || payRaw.includes('ម៉ោង') ? 'hourly' : 'monthly';
  return {
    code: (find('code') ?? '').toString().trim(),
    name: (find('name') ?? '').toString().trim(),
    department: (find('department') ?? '').toString().trim(),
    pay_type,
    base_salary: Number(find('base_salary')) || 0,
    hourly_rate: Number(find('hourly_rate')) || 0,
  };
}

export default function ImportEmployeesModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsing(true); setError(null); setDone(null);
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const mapped = json.map(mapRow).filter((r) => r.code && r.name);
      if (mapped.length === 0) setError('រកមិនឃើញជួរត្រឹមត្រូវ។ ត្រូវមាន column "លេខ" និង "ឈ្មោះ"។');
      setRows(mapped);
    } catch (err: any) {
      setError('មិនអាចអាន file បានទេ។ សូមប្រើ .xlsx ឬ .csv។');
    } finally {
      setParsing(false);
    }
  };

  const doImport = async () => {
    setImporting(true); setError(null);
    try {
      const res = await fetch('/api/employees/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Import បរាជ័យ'); }
      else { setDone(d.imported); onImported(); }
    } catch { setError('មានបញ្ហាបណ្ដាញ'); }
    finally { setImporting(false); }
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([
      ['លេខ', 'ឈ្មោះ', 'ផ្នែក', 'ប្រភេទ', 'ប្រាក់ខែ', 'ប្រាក់ម៉ោង'],
      ['EMP-001', 'ហុន ម៉ុម', 'IT', 'monthly', 300, 0],
      ['EMP-002', 'សុខ សាន', 'Sales', 'hourly', 0, 2.5],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, 'SecureAttend-Employees-Template.xlsx');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-600" /> បញ្ចូលបុគ្គលិកពី Excel</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">Upload file .xlsx ឬ .csv — column៖ លេខ, ឈ្មោះ, ផ្នែក, ប្រភេទ, ប្រាក់ខែ, ប្រាក់ម៉ោង</p>

        <button onClick={downloadTemplate} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
          <Download size={15} /> ទាញយក Template (គំរូ)
        </button>

        <label className="block border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="hidden" />
          {parsing ? (
            <span className="flex items-center justify-center gap-2 text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /> កំពុងអាន...</span>
          ) : (
            <span className="flex flex-col items-center gap-1.5 text-slate-500">
              <Upload className="w-7 h-7 text-slate-400" />
              <span className="text-sm font-medium">{fileName || 'ចុចដើម្បីជ្រើស file Excel'}</span>
            </span>
          )}
        </label>

        {error && (
          <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-xl text-sm flex gap-2 items-start border border-red-100">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" /><span className="font-medium">{error}</span>
          </div>
        )}

        {done != null && (
          <div className="mt-3 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm flex gap-2 items-center border border-emerald-100">
            <CheckCircle2 className="w-5 h-5 shrink-0" /><span className="font-medium">បញ្ចូលជោគជ័យ {done} នាក់!</span>
          </div>
        )}

        {rows.length > 0 && done == null && (
          <>
            <div className="mt-4 max-h-56 overflow-y-auto rounded-xl border border-slate-100">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 sticky top-0">
                  <tr><th className="text-left px-3 py-2">លេខ</th><th className="text-left px-3 py-2">ឈ្មោះ</th><th className="text-left px-2 py-2">ផ្នែក</th><th className="text-center px-2 py-2">ប្រភេទ</th><th className="text-right px-3 py-2">ប្រាក់</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 font-medium">{r.code}</td>
                      <td className="px-3 py-1.5">{r.name}</td>
                      <td className="px-2 py-1.5 text-slate-500">{r.department}</td>
                      <td className="px-2 py-1.5 text-center">{r.pay_type === 'hourly' ? 'ម៉ោង' : 'ខែ'}</td>
                      <td className="px-3 py-1.5 text-right">{r.pay_type === 'hourly' ? `${r.hourly_rate}/h` : r.base_salary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={doImport} disabled={importing} className="w-full mt-4 brand-gradient disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-glow-brand active:scale-95 transition flex items-center justify-center gap-2">
              {importing ? <><Loader2 className="w-5 h-5 animate-spin" /> កំពុងបញ្ចូល...</> : <>បញ្ចូល {rows.length} នាក់</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
