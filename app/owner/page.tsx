'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { Building2, ShieldCheck, Loader2, Plus, Trash2, Link2, Copy, CheckCircle2, Power, X, KeyRound, Pencil } from 'lucide-react';

const METHODS: { k: string; label: string }[] = [
  { k: 'face', label: 'Face + GPS' },
  { k: 'office_qr', label: 'Office QR' },
  { k: 'qr_card', label: 'QR Card' },
  { k: 'nfc', label: 'NFC Card' },
  { k: 'manual', label: 'Manual/Proxy' },
];

interface Org { id: string; slug: string; name: string; active: boolean; admin_password: string; attendance_methods: Record<string, boolean> }

export default function OwnerPage() {
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Org | 'new' | null>(null);
  const [copied, setCopied] = useState('');

  const load = useCallback(async (k: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/owner/orgs', { headers: { 'x-owner-key': k } });
      if (res.status === 401) { setAuthed(false); return; }
      const d = await res.json();
      setOrgs(d.orgs || []);
      setAuthed(true);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const k = sessionStorage.getItem('secure_attend_owner');
    if (k) { setKey(k); load(k); }
  }, [load]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true); setLoginErr(null);
    const res = await fetch('/api/owner/orgs', { headers: { 'x-owner-key': pw } });
    setLoggingIn(false);
    if (res.ok) {
      sessionStorage.setItem('secure_attend_owner', pw);
      setKey(pw); setAuthed(true);
      const d = await res.json(); setOrgs(d.orgs || []);
    } else setLoginErr('ពាក្យសម្ងាត់ Owner មិនត្រឹមត្រូវ។');
  };

  const toggleActive = async (o: Org) => {
    await fetch('/api/owner/orgs', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-owner-key': key }, body: JSON.stringify({ id: o.id, active: !o.active }) });
    load(key);
  };
  const del = async (o: Org) => {
    if (!confirm(`លុបស្ថាប័ន "${o.name}"? ទិន្នន័យបុគ្គលិក/វត្តមាននឹងនៅ ប៉ុន្តែគ្មាន org។`)) return;
    await fetch(`/api/owner/orgs?id=${o.id}`, { method: 'DELETE', headers: { 'x-owner-key': key } });
    load(key);
  };
  const copy = (text: string, id: string) => { navigator.clipboard?.writeText(text); setCopied(id); setTimeout(() => setCopied(''), 1500); };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  if (!authed) {
    return (
      <div className="min-h-[100dvh] bg-ambient flex items-center justify-center p-6 font-sans">
        <form onSubmit={login} className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 flex items-center justify-center shadow-card mb-4"><Building2 className="w-8 h-8 text-brand-400" /></div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">SecureAttend Owner</h1>
            <p className="text-sm text-slate-500 mt-1">ផ្ទាំងគ្រប់គ្រងស្ថាប័នទាំងអស់</p>
          </div>
          <div className="bg-white rounded-3xl shadow-card border border-slate-100 p-6 space-y-4">
            <input autoFocus type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="ពាក្យសម្ងាត់ Owner"
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none text-center text-lg tracking-widest" />
            {loginErr && <p className="text-sm text-red-600 text-center">{loginErr}</p>}
            <button disabled={loggingIn || !pw} className="w-full brand-gradient disabled:opacity-50 text-white py-3.5 rounded-2xl font-bold shadow-glow-brand active:scale-95 transition flex items-center justify-center gap-2">
              {loggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <>ចូលប្រើ <ShieldCheck className="w-5 h-5" /></>}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-ambient font-sans text-slate-900">
      <header className="brand-gradient text-white px-6 py-4 flex items-center justify-between shadow-glow-brand">
        <div className="flex items-center gap-2.5">
          <Building2 className="w-6 h-6" />
          <div><h1 className="font-bold">SecureAttend Owner</h1><p className="text-[11px] text-white/70 -mt-0.5">គ្រប់គ្រងស្ថាប័ន</p></div>
        </div>
        <button onClick={() => { sessionStorage.removeItem('secure_attend_owner'); setAuthed(false); setPw(''); }} className="text-sm bg-white/15 px-3 py-1.5 rounded-full">ចាកចេញ</button>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">ស្ថាប័ន ({orgs.length})</h2>
            <p className="text-slate-500 text-sm mt-0.5">បង្កើតស្ថាប័ននីមួយៗ ដែលប្រើដាច់ដោយឡែក</p>
          </div>
          <button onClick={() => setEditing('new')} className="flex items-center gap-2 px-4 py-2.5 brand-gradient text-white rounded-xl text-sm font-bold shadow-glow-brand"><Plus size={16} /> បង្កើតស្ថាប័ន</button>
        </div>

        {loading ? <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div> : (
          <div className="grid gap-4 sm:grid-cols-2">
            {orgs.map((o) => (
              <div key={o.id} className={`bg-white rounded-2xl shadow-card border p-5 ${o.active ? 'border-slate-100' : 'border-red-100 opacity-70'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">{o.name}{!o.active && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full">បិទ</span>}</h3>
                    <p className="text-xs text-slate-400 font-mono">{o.slug}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(o)} title="កែ" className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"><Pencil size={14} /></button>
                    <button onClick={() => toggleActive(o)} title={o.active ? 'បិទ' : 'បើក'} className={`p-1.5 rounded-lg ${o.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}><Power size={14} /></button>
                    <button onClick={() => del(o)} title="លុប" className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {METHODS.filter((m) => o.attendance_methods?.[m.k]).map((m) => (
                    <span key={m.k} className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">{m.label}</span>
                  ))}
                </div>
                <div className="mt-3 space-y-1.5">
                  <LinkRow label="App បុគ្គលិក" url={`${origin}/?org=${o.slug}`} id={`app-${o.id}`} copied={copied} onCopy={copy} />
                  <LinkRow label="Admin" url={`${origin}/admin?org=${o.slug}`} id={`admin-${o.id}`} copied={copied} onCopy={copy} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {editing && <OrgModal key={editing === 'new' ? 'new' : editing.id} ownerKey={key} org={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(key); }} />}
    </div>
  );
}

function LinkRow({ label, url, id, copied, onCopy }: { label: string; url: string; id: string; copied: string; onCopy: (t: string, id: string) => void }) {
  return (
    <button onClick={() => onCopy(url, id)} className="w-full flex items-center gap-2 text-left bg-slate-50 hover:bg-slate-100 rounded-lg px-2.5 py-1.5 transition">
      <Link2 size={12} className="text-slate-400 shrink-0" />
      <span className="text-[11px] text-slate-500 shrink-0">{label}</span>
      <span className="text-[11px] text-slate-600 font-mono truncate flex-1">{url.replace(/^https?:\/\//, '')}</span>
      {copied === id ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> : <Copy size={12} className="text-slate-400 shrink-0" />}
    </button>
  );
}

function OrgModal({ ownerKey, org, onClose, onSaved }: { ownerKey: string; org: Org | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(org?.name || '');
  const [slug, setSlug] = useState(org?.slug || '');
  const [pw, setPw] = useState('');
  const [methods, setMethods] = useState<Record<string, boolean>>(org?.attendance_methods || { face: true, office_qr: true, qr_card: false, nfc: false, manual: false });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true); setErr(null);
    const body: any = org
      ? { id: org.id, name, attendance_methods: methods, ...(pw ? { admin_password: pw } : {}) }
      : { slug, name, admin_password: pw || 'admin123', attendance_methods: methods };
    const res = await fetch('/api/owner/orgs', { method: org ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', 'x-owner-key': ownerKey }, body: JSON.stringify(body) });
    const d = await res.json();
    setSaving(false);
    if (!d.success) { setErr(d.error || 'បរាជ័យ'); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">{org ? 'កែស្ថាប័ន' : 'បង្កើតស្ថាប័នថ្មី'}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>

        <label className="block text-xs font-medium text-slate-600 mb-1">ឈ្មោះស្ថាប័ន</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ឧ. សាលា ABC"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm mb-3" />

        <label className="block text-xs font-medium text-slate-600 mb-1">Slug (URL) {org && <span className="text-slate-400">— ប្តូរមិនបាន</span>}</label>
        <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} disabled={!!org} placeholder="ឧ. abc-school"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm mb-3 disabled:bg-slate-100 font-mono" />

        <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><KeyRound size={12} /> ពាក្យសម្ងាត់ Admin {org && <span className="text-slate-400">(ទទេ = មិនប្តូរ)</span>}</label>
        <input type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={org ? '••••••' : 'admin123'}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm mb-4" />

        <label className="block text-xs font-medium text-slate-600 mb-2">វិធីចុះវត្តមានដែលអនុញ្ញាត</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {METHODS.map((m) => (
            <button key={m.k} onClick={() => setMethods((s) => ({ ...s, [m.k]: !s[m.k] }))}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition ${methods[m.k] ? 'bg-brand-500/10 border-brand-400/50 text-brand-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
              <span className={`w-4 h-4 rounded-md flex items-center justify-center ${methods[m.k] ? 'bg-brand-500 text-white' : 'border border-slate-300'}`}>{methods[m.k] && <CheckCircle2 size={11} />}</span>
              {m.label}
            </button>
          ))}
        </div>

        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <button onClick={save} disabled={saving || !name || (!org && !slug)} className="w-full brand-gradient disabled:opacity-50 text-white py-3 rounded-xl font-bold shadow-glow-brand active:scale-95 transition">
          {saving ? 'កំពុងរក្សាទុក...' : org ? 'រក្សាទុក' : 'បង្កើត'}
        </button>
      </div>
    </div>
  );
}
