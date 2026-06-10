'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import { Loader2, Printer, CreditCard, Nfc, CheckCircle2, RefreshCw, ShieldCheck, X, Smartphone, Usb } from 'lucide-react';

interface Card { code: string; name: string; department: string | null; photo: string | null; nfc_id: string | null; card: string; qr?: string }

export default function EmployeeCards() {
  const [cards, setCards] = useState<Card[]>([]);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [regFor, setRegFor] = useState<Card | null>(null);

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

      <div className="text-xs text-slate-500 bg-brand-50 border border-brand-100 rounded-xl px-3 py-2.5 flex items-center gap-2">
        <Nfc size={14} className="shrink-0" />
        <span>ស្ថានីយ៍ Kiosk (USB reader)៖ បើក <a href={`/kiosk?org=${typeof window!=='undefined' ? new URLSearchParams(window.location.search).get('org')||'' : ''}`} target="_blank" className="font-bold text-brand-700 underline">/kiosk</a> លើកុំព្យូទ័រដែលភ្ជាប់ម៉ាស៊ីនអាន។ QR card ប្រើបានគ្រប់ឧបករណ៍។</span>
      </div>

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
                <button onClick={() => setRegFor(c)}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                  <CreditCard size={13} /> {c.nfc_id ? 'ប្ដូរ NFC' : 'ចុះ NFC'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {regFor && <NfcRegisterModal card={regFor} onClose={() => setRegFor(null)} onSaved={() => { setRegFor(null); flash('ចុះ NFC ជោគជ័យ'); load(); }} />}

      {msg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {msg}
        </div>
      )}
    </div>
  );
}

function NfcRegisterModal({ card, onClose, onSaved }: { card: Card; onClose: () => void; onSaved: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const phoneSupported = typeof window !== 'undefined' && 'NDEFReader' in window;

  useEffect(() => { inputRef.current?.focus(); }, []);

  const save = async (serial: string) => {
    if (!serial) return;
    setSaving(true); setErr(null);
    try {
      await fetch('/api/employees', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: card.code, nfc_id: serial }) });
      onSaved();
    } catch { setErr('រក្សាទុកមិនបាន'); setSaving(false); }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { const v = inputRef.current?.value.trim() || ''; if (inputRef.current) inputRef.current.value = ''; save(v); }
  };

  const phoneScan = async () => {
    if (!phoneSupported) return;
    setPhoneBusy(true); setErr(null);
    try {
      const reader = new (window as any).NDEFReader();
      await reader.scan();
      const serial: string = await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), 20000);
        reader.onreading = (ev: any) => { clearTimeout(t); resolve(ev.serialNumber); };
        reader.onreadingerror = () => { clearTimeout(t); reject(new Error('err')); };
      });
      await save(serial);
    } catch { setErr('មិនអាចអាន NFC ទូរស័ព្ទបានទេ'); setPhoneBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Nfc className="w-5 h-5 text-brand-500" /> ចុះកាត NFC</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">{card.name} ({card.code}){card.nfc_id ? ` · មាន៖ ${card.nfc_id}` : ''}</p>

        {/* USB reader */}
        <div className="rounded-2xl border-2 border-brand-200 bg-brand-50/40 p-4 mb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-brand-700 mb-2"><Usb size={16} /> ម៉ាស៊ីនអាន USB (Reader)</div>
          <p className="text-xs text-slate-500 mb-2">ចុចប្រអប់ខាងក្រោម រួចប៉ះកាតលើម៉ាស៊ីនអាន — លេខកាតនឹងចូលដោយស្វ័យប្រវត្តិ។</p>
          <input ref={inputRef} onKeyDown={onKeyDown} placeholder="ប៉ះកាតលើ reader..." autoFocus
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm font-mono text-center" />
        </div>

        {/* Phone NFC */}
        {phoneSupported && (
          <button onClick={phoneScan} disabled={phoneBusy} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50">
            {phoneBusy ? <Loader2 size={16} className="animate-spin" /> : <Smartphone size={16} />} ឬប្រើ NFC ទូរស័ព្ទ (Android)
          </button>
        )}

        {err && <p className="text-sm text-red-600 mt-3 text-center">{err}</p>}
        {saving && <p className="text-sm text-brand-600 mt-3 text-center flex items-center justify-center gap-1"><Loader2 size={14} className="animate-spin" /> កំពុងរក្សាទុក...</p>}
      </div>
    </div>
  );
}
