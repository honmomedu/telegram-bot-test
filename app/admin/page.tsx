'use client';
import React, { useState, useEffect } from 'react';
import { Users, AlertCircle, CheckCircle2, ShieldCheck, Settings, Bell, Search, UserPlus, LogOut, Download, QrCode, MapPin, Loader2, RefreshCw, Trash2, BarChart3, Wallet } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const QrGenerator = dynamic(() => import('../../components/QrGenerator'), { ssr: false });
const ReportsPanel = dynamic(() => import('../../components/ReportsPanel'), { ssr: false });
const PayrollPanel = dynamic(() => import('../../components/PayrollPanel'), { ssr: false });

interface Employee {
  id?: string;
  code: string;
  name: string;
  department?: string | null;
  telegram_id?: number | null;
  active?: boolean;
  enrolled?: boolean;
  created_at?: string;
}

// Pull lat/lng out of almost any Google Maps URL or a directly-pasted
// "lat, lng" pair. Returns null when nothing usable is found.
function parseCoords(text: string): { lat: string; lng: string } | null {
  if (!text) return null;
  const t = text.trim();
  const patterns = [
    /@(-?\d+\.\d+),\s*(-?\d+\.\d+)/,            // .../@11.5564,104.9282,17z
    /[?&](?:q|query|ll|sll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/, // ?q=lat,lng
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,           // place pages !3dLAT!4dLNG
    /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/, // plain "lat, lng"
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) return { lat: m[1], lng: m[2] };
  }
  return null;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'employees' | 'reports' | 'payroll' | 'qrcode' | 'settings' | 'system'>('employees');
  
  // Settings Tab
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  // System Tab (Office Coordinates)
  const [officeLat, setOfficeLat] = useState('11.5564');
  const [officeLng, setOfficeLng] = useState('104.9282');
  const [officeRadius, setOfficeRadius] = useState('100');
  const [sysSaveStatus, setSysSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  // Auth State
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.isAdmin) {
        sessionStorage.setItem('secure_attend_admin', '1');
        setIsAdmin(true);
      } else {
        setLoginError(data.message || 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវ។');
      }
    } catch {
      setLoginError('មានបញ្ហាបណ្ដាញ។');
    } finally {
      setLoggingIn(false);
    }
  };

  // Employees
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ code: '', name: '', department: '' });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const loadEmployees = async () => {
    setEmpLoading(true);
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployees(Array.isArray(data.employees) ? data.employees : []);
    } catch {
      /* ignore */
    } finally {
      setEmpLoading(false);
    }
  };

  useEffect(() => { loadEmployees(); }, []);

  const addEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        setAddError(data.error || 'បន្ថែមមិនបាន');
      } else {
        setForm({ code: '', name: '', department: '' });
        await loadEmployees();
      }
    } catch {
      setAddError('មានបញ្ហាបណ្ដាញ');
    } finally {
      setAdding(false);
    }
  };

  const deleteEmployee = async (code: string) => {
    if (!confirm(`លុបបុគ្គលិក ${code}? ទិន្នន័យមុខ (face) របស់គាត់ក៏នឹងលុបដែរ។`)) return;
    try {
      await fetch(`/api/employees?code=${encodeURIComponent(code)}`, { method: 'DELETE' });
      await loadEmployees();
    } catch {
      /* ignore */
    }
  };

  const exportCsv = () => {
    const rows = [['Employee ID', 'Name', 'Department', 'Active', 'Face Enrolled', 'Telegram Linked']];
    employees.forEach((e) => rows.push([
      e.code, e.name, e.department || '', e.active === false ? 'No' : 'Yes',
      e.enrolled ? 'Yes' : 'No', e.telegram_id ? 'Yes' : 'No',
    ]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'employees.csv';
    a.click();
  };

  const filteredEmployees = employees.filter((e) =>
    `${e.code} ${e.name} ${e.department || ''}`.toLowerCase().includes(search.toLowerCase()),
  );

  // Load saved office coordinates (runs regardless of how admin authed)
  useEffect(() => {
     fetch('/api/office-config').then(res => res.json()).then(data => {
         if (data.lat) setOfficeLat(data.lat.toString());
         if (data.lng) setOfficeLng(data.lng.toString());
         if (data.radius) setOfficeRadius(data.radius.toString());
     }).catch(e => console.error(e));
  }, []);

  useEffect(() => {
     // Returning admin (already logged in this session)
     if (typeof window !== 'undefined' && sessionStorage.getItem('secure_attend_admin') === '1') {
         setIsAdmin(true);
         return;
     }

     // Try Telegram WebApp auto-auth; otherwise fall through to the login form
     const verifyAdmin = async () => {
         let tgId = null;
         if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
             tgId = (window as any).Telegram.WebApp.initDataUnsafe.user.id;
         }

         try {
             const res = await fetch('/api/verify-admin', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ telegramId: tgId })
             });
             const data = await res.json();
             setIsAdmin(!!data.isAdmin);
         } catch (e) {
             setIsAdmin(false);
         }
     };

     verifyAdmin();
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    setTimeout(() => {
       // In a real app, this would send an API request to store in a DB / secure vault
       setSaveStatus('success');
       setTimeout(() => setSaveStatus('idle'), 3000);
    }, 1000);
  };

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSysSaveStatus('saving');
    try {
        await fetch('/api/office-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               lat: parseFloat(officeLat) || 11.5564,
               lng: parseFloat(officeLng) || 104.9282,
               radius: parseFloat(officeRadius) || 100
            })
        });
        setSysSaveStatus('success');
        setTimeout(() => setSysSaveStatus('idle'), 3000);
    } catch (error) {
        console.error("Save error:", error);
        setSysSaveStatus('idle');
    }
  };

  if (isAdmin === null) {
      return (
         <div className="min-h-screen flex items-center justify-center bg-ambient p-4 font-sans">
             <Loader2 className="w-7 h-7 text-brand-400 animate-spin" />
         </div>
      );
  }

  if (isAdmin === false) {
      return (
         <div className="min-h-screen flex items-center justify-center bg-ambient p-6 font-sans">
             <div className="w-full max-w-sm">
                 <div className="flex flex-col items-center text-center mb-7">
                     <div className="w-16 h-16 rounded-3xl brand-gradient flex items-center justify-center shadow-glow-brand mb-4">
                         <ShieldCheck className="w-8 h-8 text-white" />
                     </div>
                     <h1 className="text-2xl font-bold tracking-tight text-slate-900">SecureAttend Admin</h1>
                     <p className="text-sm text-slate-500 mt-1">ផ្ទាំងគ្រប់គ្រងប្រព័ន្ធ</p>
                 </div>
                 <form onSubmit={handlePasswordLogin} className="bg-white rounded-3xl shadow-card border border-slate-100 p-6 space-y-4">
                     <label className="block text-sm font-bold text-slate-700">ពាក្យសម្ងាត់ Admin</label>
                     <input
                         autoFocus
                         type="password"
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                         placeholder="••••••••"
                         className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none transition text-center text-lg tracking-widest"
                     />
                     {loginError && (
                         <p className="text-sm text-red-600 flex items-center justify-center gap-1.5"><AlertCircle size={14} /> {loginError}</p>
                     )}
                     <button type="submit" disabled={loggingIn || !password} className="w-full brand-gradient disabled:opacity-50 text-white py-3.5 rounded-2xl font-bold shadow-glow-brand active:scale-95 transition flex items-center justify-center gap-2">
                         {loggingIn ? <><Loader2 className="w-5 h-5 animate-spin" /> កំពុងចូល...</> : 'ចូលប្រើ'}
                     </button>
                     <Link href="/" className="block text-center text-xs text-slate-400 hover:text-slate-600 transition pt-1">ត្រឡប់ទៅទំព័រដើម</Link>
                 </form>
             </div>
         </div>
      );
  }

  return (
    <div className="min-h-screen bg-ambient flex flex-col md:flex-row font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex h-screen sticky top-0">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center text-white shadow-glow-brand"><ShieldCheck size={18} /></div>
                <div className="leading-tight">
                    <h1 className="text-base font-bold tracking-tight text-white">SecureAttend</h1>
                    <p className="text-[10px] font-medium text-slate-400 -mt-0.5">ផ្ទាំងគ្រប់គ្រង</p>
                </div>
            </div>
        </div>
        <div className="p-4 flex-1 space-y-1">
            <button 
                onClick={() => setActiveTab('employees')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'employees' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-white'}`}
            >
                <Users size={18} /> គ្រប់គ្រងបុគ្គលិក (Employees)
            </button>
            <button
                onClick={() => setActiveTab('reports')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'reports' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-white'}`}
            >
                <BarChart3 size={18} /> របាយការណ៍វត្តមាន
            </button>
            <button
                onClick={() => setActiveTab('payroll')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'payroll' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-white'}`}
            >
                <Wallet size={18} /> ប្រាក់ខែ (Payroll)
            </button>
            <button
                onClick={() => setActiveTab('qrcode')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'qrcode' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-white'}`}
            >
                <QrCode size={18} /> QR Code ការិយាល័យ
            </button>
            <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-white'}`}
            >
                <Bell size={18} /> Telegram Notifications
            </button>
            <button 
                onClick={() => setActiveTab('system')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'system' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-slate-800 hover:text-white'}`}
            >
                <Settings size={18} /> ប្រព័ន្ធ (System)
            </button>
        </div>
        <div className="p-4 border-t border-slate-800">
            <button
                onClick={() => { sessionStorage.removeItem('secure_attend_admin'); setIsAdmin(false); setPassword(''); }}
                className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
                <LogOut size={16} /> ចាកចេញ (Logout)
            </button>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <div className="md:hidden brand-gradient text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-glow-brand">
          <div className="font-bold flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-white/15 ring-1 ring-white/25 flex items-center justify-center"><ShieldCheck size={16} /></div> SecureAttend
          </div>
          <div className="flex gap-2">
             <button onClick={() => setActiveTab('employees')} className={`p-2 rounded ${activeTab === 'employees' ? 'bg-white/20 text-white' : 'hover:bg-white/10'}`}><Users size={20}/></button>
             <button onClick={() => setActiveTab('reports')} className={`p-2 rounded ${activeTab === 'reports' ? 'bg-white/20 text-white' : 'hover:bg-white/10'}`}><BarChart3 size={20}/></button>
             <button onClick={() => setActiveTab('payroll')} className={`p-2 rounded ${activeTab === 'payroll' ? 'bg-white/20 text-white' : 'hover:bg-white/10'}`}><Wallet size={20}/></button>
             <button onClick={() => setActiveTab('qrcode')} className={`p-2 rounded ${activeTab === 'qrcode' ? 'bg-white/20 text-white' : 'hover:bg-white/10'}`}><QrCode size={20}/></button>
             <button onClick={() => setActiveTab('settings')} className={`p-2 rounded ${activeTab === 'settings' ? 'bg-white/20 text-white' : 'hover:bg-white/10'}`}><Bell size={20}/></button>
             <button onClick={() => setActiveTab('system')} className={`p-2 rounded ${activeTab === 'system' ? 'bg-white/20 text-white' : 'hover:bg-white/10'}`}><Settings size={20}/></button>
          </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto w-full max-w-5xl">
        
        {activeTab === 'employees' && (
            <div className="space-y-6 animate-in fade-in duration-300">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                   <div>
                       <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">គ្រប់គ្រងបុគ្គលិក</h2>
                       <p className="text-slate-500 mt-1">បង្កើតលេខបុគ្គលិក (Employee ID) → បុគ្គលិក activate + ចុះឈ្មោះមុខ ដោយខ្លួនឯង</p>
                   </div>
                   <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition shadow-sm">
                       <Download size={16} /> Export CSV
                   </button>
                </header>

                {/* Add employee form */}
                <form onSubmit={addEmployee} className="bg-white rounded-2xl shadow-card border border-slate-100 p-5">
                    <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><UserPlus size={16} className="text-brand-600" /> បន្ថែមបុគ្គលិកថ្មី</p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Employee ID (ឧ. EMP-001)" className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none transition text-sm font-mono" />
                        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ឈ្មោះ" className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none transition text-sm" />
                        <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="ផ្នែក (ស្រេចចិត្ត)" className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none transition text-sm" />
                        <button type="submit" disabled={adding} className="flex items-center justify-center gap-2 px-4 py-2.5 brand-gradient hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-glow-brand">
                            {adding ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} បន្ថែម
                        </button>
                    </div>
                    {addError && <p className="text-sm text-red-600 mt-2 flex items-center gap-1.5"><AlertCircle size={14} /> {addError}</p>}
                </form>

                <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="ស្វែងរកឈ្មោះ ឬអត្តលេខ..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none transition" />
                        </div>
                        <button onClick={loadEmployees} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"><RefreshCw size={16} className={empLoading ? 'animate-spin' : ''} /></button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold bg-slate-50">
                                    <th className="p-4">Employee ID</th>
                                    <th className="p-4">ឈ្មោះ</th>
                                    <th className="p-4">ផ្នែក</th>
                                    <th className="p-4">មុខ (Face)</th>
                                    <th className="p-4">Telegram</th>
                                    <th className="p-4 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {empLoading ? (
                                    <tr><td colSpan={6} className="p-10 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin inline" /></td></tr>
                                ) : filteredEmployees.length === 0 ? (
                                    <tr><td colSpan={6} className="p-10 text-center text-slate-400">មិនទាន់មានបុគ្គលិក — បន្ថែមនៅខាងលើ</td></tr>
                                ) : filteredEmployees.map((emp) => (
                                    <tr key={emp.code} className="hover:bg-slate-50/50 transition">
                                        <td className="p-4 font-mono text-slate-500">{emp.code}</td>
                                        <td className="p-4 font-medium text-slate-900">{emp.name}</td>
                                        <td className="p-4 text-slate-600">{emp.department || '—'}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${emp.enrolled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                                                {emp.enrolled ? <><CheckCircle2 size={12} /> ចុះរួច</> : 'មិនទាន់'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${emp.telegram_id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {emp.telegram_id ? 'ភ្ជាប់' : 'មិនទាន់'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button onClick={() => deleteEmployee(emp.code)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-500">
                        បុគ្គលិកសរុប {employees.length} នាក់ · ភ្ជាប់ Telegram ៖ ផ្ញើ <code className="bg-slate-100 px-1 rounded">/link &lt;EmployeeID&gt;</code> ទៅ Bot
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'reports' && <ReportsPanel />}

        {activeTab === 'payroll' && <PayrollPanel />}

        {activeTab === 'qrcode' && <QrGenerator />}

        {activeTab === 'settings' && (
            <div className="space-y-6 max-w-2xl animate-in fade-in duration-300">
                <header>
                   <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Telegram Integration</h2>
                   <p className="text-slate-500 mt-1">ភ្ជាប់ប្រព័ន្ធ Admin ជាមួយនឹង Telegram ដើម្បីទទួលសារជូនដំណឹងពេលមានអ្នក Check-In/Out</p>
                </header>

                <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 space-y-6">
                   <div className="flex items-start gap-4 p-4 bg-indigo-50 text-indigo-900 rounded-lg border border-indigo-100">
                       <Bell className="w-6 h-6 shrink-0 mt-0.5" />
                       <div className="text-sm">
                           <p className="font-semibold mb-1">របៀបភ្ជាប់ (How to connect):</p>
                           <ol className="list-decimal list-inside space-y-1 opacity-90">
                               <li>ចូលទៅកាន់ Telegram ហើយស្វែងរក <strong>@BotFather</strong> ដើម្បីបង្កើត Bot ថ្មី</li>
                               <li>Copy យក <strong>Bot Token</strong> ដែល BotFather អោយ</li>
                               <li>បន្ថែម Bot នោះចូលទៅក្នុង Group Telegram របស់អ្នក</li>
                               <li>ភ្ជាប់ជាមួយ <strong>@userinfobot</strong> ឬទៅលើវេបសាយដើម្បីយក <strong>Group Chat ID</strong></li>
                           </ol>
                       </div>
                   </div>

                   <form onSubmit={handleSaveSettings} className="space-y-5">
                       <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Telegram Bot Token</label>
                           <input 
                               type="password" 
                               value={telegramToken}
                               onChange={(e) => setTelegramToken(e.target.value)}
                               placeholder="ឧ. 123456789:ABCdefGHIjklMNO..."
                               className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:outline-none transition font-mono text-sm"
                           />
                           <p className="text-xs text-slate-500 mt-2">កំណត់ដោយអថេរ <code className="bg-slate-100 p-0.5 rounded text-indigo-600">TELEGRAM_BOT_TOKEN</code> ក្នុង Server (.env)</p>
                       </div>

                       <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Admin Group Chat ID</label>
                           <input 
                               type="text" 
                               value={telegramChatId}
                               onChange={(e) => setTelegramChatId(e.target.value)}
                               placeholder="ឧ. -100123456789"
                               className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:outline-none transition font-mono text-sm"
                           />
                           <p className="text-xs text-slate-500 mt-2">កំណត់ដោយអថេរ <code className="bg-slate-100 p-0.5 rounded text-indigo-600">TELEGRAM_ADMIN_CHAT_ID</code> ក្នុង Server (.env)</p>
                       </div>

                       {saveStatus === 'success' && (
                           <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-sm flex items-center gap-2">
                               <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                               បានរក្សាទុកការកំណត់យ៉ាងជោគជ័យ!
                           </div>
                       )}

                       <div className="flex justify-end pt-4 border-t border-slate-100">
                           <button 
                               type="submit"
                               disabled={saveStatus === 'saving'}
                               className="px-6 py-2.5 brand-gradient hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl shadow-glow-brand transition flex items-center gap-2"
                           >
                               {saveStatus === 'saving' ? (
                                   <>កំពុងរក្សាទុក...</>
                               ) : (
                                   <>រក្សាទុកការកំណត់</>
                               )}
                           </button>
                       </div>
                   </form>
                </div>
            </div>
        )}

        {activeTab === 'system' && (
            <div className="space-y-6 max-w-2xl animate-in fade-in duration-300">
                <header>
                   <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">ការកំណត់ប្រព័ន្ធ (System Settings)</h2>
                   <p className="text-slate-500 mt-1">កំណត់ទីតាំងការិយាល័យ (Office Location) និងរយៈចម្ងាយអនុញ្ញាត (Radius)</p>
                </header>

                <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 space-y-6">
                   <div className="flex items-start gap-4 p-4 bg-amber-50 text-amber-900 rounded-lg border border-amber-100">
                       <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
                       <div className="text-sm border-amber-200">
                           <p className="font-semibold mb-1">បញ្ជាក់:</p>
                           <p className="opacity-90">អ្នកអាចចូលទៅកាន់ Google Maps ដើម្បីថតចម្លង (Copy) តម្លៃ Latitude និង Longitude ការិយាល័យរបស់អ្នករួចយកមកផាស (Paste) នៅទីនេះ។</p>
                       </div>
                   </div>

                   <form onSubmit={handleSaveSystemSettings} className="space-y-5">
                       <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                           <label className="block text-sm font-medium text-slate-700">បិទភ្ជាប់ Google Maps Link ឬ លេខ Coordinates (Paste)</label>
                           <div className="flex gap-2">
                               <input
                                   type="text"
                                   id="mapLinkInput"
                                   placeholder="ឧ. 11.5564, 104.9282  ឬ  https://maps.google.com/...@11.55,104.92"
                                   onChange={(e) => {
                                       const c = parseCoords(e.target.value);
                                       if (c) { setOfficeLat(c.lat); setOfficeLng(c.lng); }
                                   }}
                                   className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:outline-none transition text-sm"
                               />
                               <button
                                   type="button"
                                   onClick={() => {
                                       const link = (document.getElementById('mapLinkInput') as HTMLInputElement).value;
                                       const c = parseCoords(link);
                                       if (c) {
                                           setOfficeLat(c.lat);
                                           setOfficeLng(c.lng);
                                       } else {
                                           alert('មិនអាចទាញយក Coordinates បានទេ!\n\nសូម៖\n• Long-press លើ Google Maps រួច copy លេខ (ឧ. 11.5564, 104.9282) មកដាក់ផ្ទាល់\n• ឬ ប្រើ link វែងពេញ (មាន @lat,lng) — កុំប្រើ link ខ្លី maps.app.goo.gl');
                                       }
                                   }}
                                   className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg shadow-sm transition whitespace-nowrap text-sm"
                               >
                                   ទាញយក
                               </button>
                           </div>
                           <button
                               type="button"
                               onClick={() => {
                                   if (!navigator.geolocation) { alert('Browser មិនគាំទ្រ GPS ទេ'); return; }
                                   navigator.geolocation.getCurrentPosition(
                                       (pos) => { setOfficeLat(pos.coords.latitude.toFixed(6)); setOfficeLng(pos.coords.longitude.toFixed(6)); },
                                       () => alert('មិនអាចទាញទីតាំងបានទេ។ សូមអនុញ្ញាតសិទ្ធិ Location។'),
                                       { enableHighAccuracy: true, timeout: 15000 }
                                   );
                               }}
                               className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition text-sm"
                           >
                               <MapPin size={16} /> ប្រើទីតាំងបច្ចុប្បន្នរបស់ខ្ញុំ (GPS)
                           </button>
                           <p className="text-xs text-slate-500 leading-relaxed">
                               ងាយបំផុត៖ ឈរនៅការិយាល័យ រួចចុចប៊ូតុងបៃតង "ប្រើទីតាំងបច្ចុប្បន្ន" ខាងលើ — វានឹងបំពេញ Latitude/Longitude ស្វ័យប្រវត្តិ។
                           </p>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                           <div>
                               <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
                               <input 
                                   type="number" step="any"
                                   value={officeLat}
                                   onChange={(e) => setOfficeLat(e.target.value)}
                                   placeholder="ឧ. 11.5564"
                                   className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:outline-none transition font-mono text-sm"
                               />
                           </div>
                           <div>
                               <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
                               <input 
                                   type="number" step="any"
                                   value={officeLng}
                                   onChange={(e) => setOfficeLng(e.target.value)}
                                   placeholder="ឧ. 104.9282"
                                   className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:outline-none transition font-mono text-sm"
                               />
                           </div>
                       </div>

                       <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">រយៈចម្ងាយអនុញ្ញាត (Radius in Meters)</label>
                           <input 
                               type="number" 
                               value={officeRadius}
                               onChange={(e) => setOfficeRadius(e.target.value)}
                               placeholder="ឧ. 100"
                               className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:outline-none transition font-mono text-sm"
                           />
                           <p className="text-xs text-slate-500 mt-2">ចម្ងាយអតិបរមាពីទីតាំងដែលកំណត់ខាងលើ ដែលអាចអនុញ្ញាតកម្មវិធីបញ្ជិកា Check-IN/OUT បាន។</p>
                       </div>

                       {sysSaveStatus === 'success' && (
                           <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-sm flex items-center gap-2">
                               <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                               បានរក្សាទុកទីតាំងយ៉ាងជោគជ័យ!
                           </div>
                       )}

                       <div className="flex justify-end pt-4 border-t border-slate-100">
                           <button 
                               type="submit"
                               disabled={sysSaveStatus === 'saving'}
                               className="px-6 py-2.5 brand-gradient hover:opacity-90 disabled:opacity-50 text-white font-semibold rounded-xl shadow-glow-brand transition flex items-center gap-2"
                           >
                               {sysSaveStatus === 'saving' ? (
                                   <>កំពុងរក្សាទុក...</>
                               ) : (
                                   <>រក្សាទុកការកំណត់</>
                               )}
                           </button>
                       </div>
                   </form>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
