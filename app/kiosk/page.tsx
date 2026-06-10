'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Nfc, CheckCircle2, XCircle, Clock, ShieldCheck, Loader2 } from 'lucide-react';
import { initOrgContext } from '@/lib/orgClient';

type Mode = 'auto' | 'IN' | 'OUT';
type Result = { ok: boolean; name?: string; code?: string; type?: 'IN' | 'OUT'; time?: string } | null;

export default function KioskPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('auto');
  const [orgName, setOrgName] = useState('');
  const [now, setNow] = useState(new Date());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [recent, setRecent] = useState<{ name: string; type: string; time: string }[]>([]);
  const modeRef = useRef<Mode>('auto');
  modeRef.current = mode;

  useEffect(() => {
    initOrgContext();
    fetch('/api/org').then((r) => r.json()).then((d) => setOrgName(d.name || '')).catch(() => {});
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const focusInput = useCallback(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    focusInput();
    const i = setInterval(focusInput, 1500); // keep the reader input focused
    return () => clearInterval(i);
  }, [focusInput]);

  const submit = async (uid: string) => {
    if (!uid || busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/attendance/kiosk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nfc: uid, mode: modeRef.current }),
      });
      const d = await res.json();
      if (d.matched) {
        setResult({ ok: true, name: d.name, code: d.code, type: d.type, time: d.time });
        setRecent((r) => [{ name: d.name, type: d.type, time: d.time }, ...r].slice(0, 6));
      } else {
        setResult({ ok: false });
      }
    } catch {
      setResult({ ok: false });
    } finally {
      setBusy(false);
      setTimeout(() => { setResult(null); focusInput(); }, 3500);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const v = inputRef.current?.value.trim() || '';
      if (inputRef.current) inputRef.current.value = '';
      submit(v);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white font-sans flex flex-col overflow-hidden relative" onClick={focusInput}>
      {/* ambient */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* hidden capture input for the USB reader */}
      <input ref={inputRef} onKeyDown={onKeyDown} autoFocus
        className="absolute opacity-0 w-px h-px -z-10" inputMode="none" aria-hidden />

      {/* Header */}
      <header className="px-8 py-5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl brand-gradient flex items-center justify-center shadow-glow-brand"><ShieldCheck className="w-6 h-6" /></div>
          <div>
            <h1 className="text-xl font-bold">{orgName || 'SecureAttend'}</h1>
            <p className="text-xs text-slate-400">ស្ថានីយ៍ចុះវត្តមាន (Kiosk)</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold font-mono tabular-nums">{now.toLocaleTimeString('en-US', { hour12: false })}</div>
          <div className="text-xs text-slate-400">{now.toLocaleDateString('km-KH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </header>

      {/* Mode selector */}
      <div className="flex justify-center gap-2 relative z-10">
        {([{ k: 'auto', l: 'ស្វ័យប្រវត្តិ' }, { k: 'IN', l: 'ចូលធ្វើការ' }, { k: 'OUT', l: 'ចេញពីធ្វើការ' }] as const).map(({ k, l }) => (
          <button key={k} onClick={() => setMode(k)}
            className={`px-5 py-2 rounded-full text-sm font-bold transition ${mode === k ? 'brand-gradient text-white shadow-glow-brand' : 'bg-white/10 text-slate-300'}`}>{l}</button>
        ))}
      </div>

      {/* Center scan zone */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-brand-500/30 animate-pulse-ring" />
          <div className="w-44 h-44 rounded-full brand-gradient flex items-center justify-center shadow-glow-brand relative">
            {busy ? <Loader2 className="w-20 h-20 animate-spin" /> : <Nfc className="w-20 h-20" />}
          </div>
        </div>
        <h2 className="mt-10 text-2xl font-bold">ប៉ះកាតលើ Reader</h2>
        <p className="text-slate-400 mt-2">សូមដាក់កាត NFC/RFID លើម៉ាស៊ីនអាន ដើម្បីចុះវត្តមាន</p>
      </main>

      {/* Recent */}
      {recent.length > 0 && (
        <div className="px-8 pb-6 relative z-10">
          <div className="flex gap-2 overflow-x-auto">
            {recent.map((r, i) => (
              <div key={i} className="shrink-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm">
                <span className={`font-semibold ${r.type === 'IN' ? 'text-emerald-400' : 'text-amber-400'}`}>{r.type}</span>
                <span className="text-slate-300 ml-2">{r.name}</span>
                <span className="text-slate-500 ml-2 text-xs">{new Date(r.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result overlay */}
      {result && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-sm ${result.ok ? 'bg-emerald-600/90' : 'bg-red-600/90'}`}>
          {result.ok ? <CheckCircle2 className="w-28 h-28" /> : <XCircle className="w-28 h-28" />}
          {result.ok ? (
            <>
              <h2 className="mt-6 text-4xl font-bold">{result.name}</h2>
              <p className="text-2xl mt-2">{result.type === 'IN' ? '✅ ចូលធ្វើការ' : '👋 ចេញពីធ្វើការ'}</p>
              <p className="text-lg mt-1 opacity-90 flex items-center gap-2"><Clock className="w-5 h-5" /> {result.time && new Date(result.time).toLocaleTimeString('en-US', { hour12: false })}</p>
            </>
          ) : (
            <>
              <h2 className="mt-6 text-3xl font-bold">កាតមិនស្គាល់</h2>
              <p className="text-lg mt-2 opacity-90">សូមទាក់ទង Admin ដើម្បីចុះបញ្ជីកាត</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
