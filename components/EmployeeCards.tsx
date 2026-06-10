'use client';
import React, { useEffect, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { Loader2, Printer, CreditCard, Nfc, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';

interface Card { code: string; name: string; department: string | null; photo: string | null; nfc_id: string | null; card: string; qr?: string }

export default function EmployeeCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [nfcBusy, setNfcBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const nfcSupported = typeof window !== 'undefined' && 'NDEFReader' in window;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/employees/cards');
      const d = await res.json();
      setOrgName(d.orgName || '');
      const withQr: Card[] = await Promise.all(
        (d.employees || []).map(async (e: Card) => ({
          ...e,
          qr: await QRCode.toDataURL(e.card, { width: 320, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1e1b4b', light: '#ffffff' } }),
        })),
      );
      setCards(withQr);
    } catch { setCards([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3000); };

  // Register an NFC tag's serial to an employee (Android Chrome only)
  const registerNfc = async (code: string) => {
    if (!nfcSupported) { flash('ឧបករណ៍នេះមិនគាំទ្រ NFC ទេ (ប្រើ Chrome លើ Android)'); return; }
    setNfcBusy(code);
    try {
      const reader = new (window as any).NDEFReader();
      await reader.scan();
      const serial: string = await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), 20000);
        reader.onreading = (ev: any) => { clearTimeout(t); resolve(ev.serialNumber); };
        reader.onreadingerror = () => { clearTimeout(t); reject(new Error('read error')); };
      });
      await fetch('/api/employees', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, nfc_id: serial }) });
      flash(`ចុះ NFC សម្រាប់ ${code} ជោគជ័យ`);
      load();
    } catch {
      flash('មិនអាចអាន NFC បានទេ។ សូមប៉ះកាតម្ដងទៀត។');
    } finally { setNfcBusy(null); }
  };

  const printAll = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const cardsHtml = cards.map((c) => `
      <div class="card">
        <div class="head">🛡️ ${orgName || 'SecureAttend'}</div>
        <div class="body">
          ${c.photo ? `<img class="photo" src="${c.photo}" />` : `<div class="photo ph">${(c.name || '?').charAt(0)}</div>`}
          <div class="info"><div class="name">${c.name}</div><div class="code">${c.code}</div>${c.department ? `<div class="dept">${c.department}</div>` : ''}</div>
          <img class="qr" src="${c.qr}" />
        </div>
      </div>`).join('');
    w.document.write(`<html><head><title>Employee Cards</title><style>
      body{font-family:sans-serif;margin:0;padding:12px;display:flex;flex-wrap:wrap;gap:10px;background:#f1f5f9}
      .card{width:320px;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.08);page-break-inside:avoid}
      .head{background:linear-gradient(135deg,#4f46e5,#8b5cf6);color:#fff;font-weight:700;font-size:13px;padding:8px 12px}
      .body{display:flex;align-items:center;gap:10px;padding:12px}
      .photo{width:56px;height:56px;border-radius:12px;object-fit:cover;border:2px solid #e0e7ff}
      .photo.ph{display:flex;align-items:center;justify-content:center;background:#eef2ff;color:#4f46e5;font-weight:700;font-size:24px}
      .info{flex:1;min-width:0}.name{font-weight:700;color:#0f172a}.code{font-size:12px;color:#64748b;font-family:monospace}.dept{font-size:11px;color:#94a3b8}
      .qr{width:64px;height:64px}
      @media print{body{background:#fff}}
    </style></head><body>${cardsHtml}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">កាតបុគ្គលិក (QR / NFC)</h2>
          <p className="text-slate-500 mt-1">បង្កើតកាត QR ឱ្យបុគ្គលិក · ព្រីន · ស្កេនកាតដើម្បីចុះវត្តមាន</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"><RefreshCw size={16} /></button>
          <button onClick={printAll} disabled={!cards.length} className="flex items-center gap-2 px-4 py-2.5 brand-gradient disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-glow-brand"><Printer size={16} /> ព្រីនកាតទាំងអស់</button>
        </div>
      </header>

      {!nfcSupported && (
        <div className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center gap-2">
          <Nfc size={14} /> NFC register អាចប្រើបានតែលើ Chrome (Android)។ QR card ប្រើបានគ្រប់ឧបករណ៍។
        </div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
      ) : cards.length === 0 ? (
        <div className="py-16 text-center text-slate-400">មិនមានបុគ្គលិក — បន្ថែមនៅ tab "គ្រប់គ្រងបុគ្គលិក"</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div key={c.code} className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
              <div className="brand-gradient text-white px-4 py-2 text-xs font-bold flex items-center gap-1.5"><ShieldCheck size={13} /> {orgName || 'SecureAttend'}</div>
              <div className="p-4 flex items-center gap-3">
                {c.photo ? <img src={c.photo} alt="" className="w-14 h-14 rounded-xl object-cover ring-2 ring-brand-100" /> :
                  <div className="w-14 h-14 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center text-2xl font-bold">{(c.name || '?').charAt(0)}</div>}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 truncate">{c.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{c.code}</div>
                  {c.department && <div className="text-[11px] text-slate-400 truncate">{c.department}</div>}
                </div>
                {c.qr && <img src={c.qr} alt="QR" className="w-16 h-16" />}
              </div>
              <div className="px-4 pb-3 flex items-center justify-between">
                <span className={`text-[11px] flex items-center gap-1 ${c.nfc_id ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <Nfc size={13} /> {c.nfc_id ? 'NFC ភ្ជាប់' : 'គ្មាន NFC'}
                </span>
                <button onClick={() => registerNfc(c.code)} disabled={nfcBusy === c.code}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 disabled:opacity-50">
                  {nfcBusy === c.code ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />} {c.nfc_id ? 'ប្ដូរ NFC' : 'ចុះ NFC'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {msg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {msg}
        </div>
      )}
    </div>
  );
}
