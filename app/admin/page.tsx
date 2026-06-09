'use client';
import React, { useState, useEffect } from 'react';
import { Users, AlertCircle, CheckCircle2, ShieldCheck, Settings, Bell, Search, UserPlus, LogOut, Download, QrCode } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const QrGenerator = dynamic(() => import('../../components/QrGenerator'), { ssr: false });

interface Employee {
  id: string;
  name: string;
  department: string;
  status: 'Active' | 'Inactive';
  lastActive: string;
}

const mockEmployees: Employee[] = [
  { id: 'EMP-001', name: 'Sok San', department: 'IT', status: 'Active', lastActive: '2026-06-09T08:30:00' },
  { id: 'EMP-002', name: 'Chea Roth', department: 'HR', status: 'Active', lastActive: '2026-06-08T17:15:00' },
  { id: 'EMP-003', name: 'Nita Ly', department: 'Sales', status: 'Inactive', lastActive: '2026-06-01T10:00:00' },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'employees' | 'qrcode' | 'settings' | 'system'>('employees');
  
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
  const [authMsg, setAuthMsg] = useState('កំពុងផ្ទៀងផ្ទាត់សិទ្ធិ (Verifying Admin)...');

  useEffect(() => {
     // Admin verification using Telegram WebApp data
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
             setIsAdmin(data.isAdmin);
             if (!data.isAdmin) {
                 setAuthMsg('អ្នកមិនមានសិទ្ធិចូលផ្ទាំងនេះទេ! (Access Denied). សូមចូលតាម Telegram Bot ដែលមានសិទ្ធិជា Admin។');
             }
         } catch (e) {
             setIsAdmin(false);
             setAuthMsg('មានបញ្ហាក្នុងការផ្ទៀងផ្ទាត់សិទ្ធិ។');
         }
     };

     verifyAdmin();

     if (typeof window !== 'undefined') {
       // Fetch Office Coordinates from API
       fetch('/api/office-config').then(res => res.json()).then(data => {
           if (data.lat) setOfficeLat(data.lat.toString());
           if (data.lng) setOfficeLng(data.lng.toString());
           if (data.radius) setOfficeRadius(data.radius.toString());
       }).catch(e => console.error(e));
     }
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

  if (isAdmin === null || isAdmin === false) {
      return (
         <div className="min-h-screen flex items-center justify-center bg-ambient p-4 font-sans">
             <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md text-center">
                 {isAdmin === null ? (
                     <div className="animate-pulse text-indigo-600 font-medium">កំពុងផ្ទៀងផ្ទាត់សិទ្ធិ...</div>
                 ) : (
                     <>
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-900 mb-2">គ្មានសិទ្ធិអនុញ្ញាត</h2>
                        <p className="text-slate-500">{authMsg}</p>
                        <Link href="/" className="inline-block mt-6 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition">ត្រឡប់ទៅទំព័រដើម</Link>
                     </>
                 )}
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
            <Link href="/" className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                <LogOut size={16} /> ត្រឡប់ទៅកម្មវិធីបញ្ជិកា
            </Link>
        </div>
      </aside>

      {/* Mobile Topbar */}
      <div className="md:hidden brand-gradient text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-glow-brand">
          <div className="font-bold flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-white/15 ring-1 ring-white/25 flex items-center justify-center"><ShieldCheck size={16} /></div> SecureAttend
          </div>
          <div className="flex gap-2">
             <button onClick={() => setActiveTab('employees')} className={`p-2 rounded ${activeTab === 'employees' ? 'bg-white/20 text-white' : 'hover:bg-white/10'}`}><Users size={20}/></button>
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
                       <p className="text-slate-500 mt-1">គ្រប់គ្រងគណនី និងមើលប្រវត្តិវត្តមានបុគ្គលិក</p>
                   </div>
                   <div className="flex gap-3">
                       <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition shadow-sm">
                           <Download size={16} /> Export CSV
                       </button>
                       <button className="flex items-center gap-2 px-4 py-2 brand-gradient hover:opacity-90 text-white rounded-xl text-sm font-semibold transition shadow-glow-brand">
                           <UserPlus size={16} /> បន្ថែមបុគ្គលិកថ្មី
                       </button>
                   </div>
                </header>

                <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input type="text" placeholder="ស្វែងរកឈ្មោះ ឬអត្តលេខ..." className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none transition" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold bg-slate-50">
                                    <th className="p-4">អត្តលេខ</th>
                                    <th className="p-4">ឈ្មោះបុគ្គលិក</th>
                                    <th className="p-4">ផ្នែក</th>
                                    <th className="p-4">ស្ថានភាព</th>
                                    <th className="p-4 text-right">សកម្មភាពចុងក្រោយ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {mockEmployees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-slate-50/50 transition">
                                        <td className="p-4 font-mono text-slate-500">{emp.id}</td>
                                        <td className="p-4 font-medium text-slate-900">{emp.name}</td>
                                        <td className="p-4 text-slate-600">{emp.department}</td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${emp.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                                                {emp.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right text-slate-500">
                                            {new Date(emp.lastActive).toLocaleString('km-KH')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-500 flex justify-between">
                        <span>បង្ហាញមុខបុគ្គលិកចំនួន 3 នាក់</span>
                        <div className="flex gap-2">
                             <button className="px-2 py-1 border border-slate-200 rounded disabled:opacity-50" disabled>« Previous</button>
                             <button className="px-2 py-1 border border-slate-200 rounded disabled:opacity-50" disabled>Next »</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

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
                       <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                           <label className="block text-sm font-medium text-slate-700 mb-1">បិទភ្ជាប់ Google Maps Link ទីនេះ (Paste link)</label>
                           <div className="flex gap-2">
                               <input 
                                   type="text"
                                   id="mapLinkInput"
                                   placeholder="https://www.google.com/maps/place/..."
                                   className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:outline-none transition text-sm"
                               />
                               <button 
                                   type="button"
                                   onClick={() => {
                                       const link = (document.getElementById('mapLinkInput') as HTMLInputElement).value;
                                       const match = link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                                       const qMatch = link.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
                                       if (match) {
                                           setOfficeLat(match[1]);
                                           setOfficeLng(match[2]);
                                       } else if (qMatch) {
                                           setOfficeLat(qMatch[1]);
                                           setOfficeLng(qMatch[2]);
                                       } else {
                                           alert('មិនអាចទាញយក Coordinates ពី Link នេះបានទេ! សូមសាកល្បង Copy URL ដែលវែង។');
                                       }
                                   }}
                                   className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg shadow-sm transition whitespace-nowrap text-sm"
                               >
                                   ទាញយក (Extract)
                               </button>
                           </div>
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
                                   <>រក្សាទុុកការកំណត់</>
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
