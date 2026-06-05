'use client';
import React, { useState } from 'react';
import { Send, Users, AlertCircle, CheckCircle2, Home } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState('');

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to broadcast');
      
      setStatus('success');
      setResultMessage(`ផ្សព្វផ្សាយជោគជ័យទៅកាន់ ${data.successCount}/${data.total} អ្នកប្រើប្រាស់។`);
      setMessage('');
    } catch (err: any) {
      setStatus('error');
      setResultMessage(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 text-slate-900 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation */}
        <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition">
          <Home className="w-4 h-4 mr-2" /> ត្រលប់ទៅទំព័រដើមការណែនាំ
        </Link>
        
        <header className="flex items-center space-x-3 pb-6 border-b border-slate-200">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <Send size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bot Admin Mini App</h1>
            <p className="text-slate-500 text-sm">ប្រព័ន្ធគ្រប់គ្រង និងផ្សព្វផ្សាយដំណឹង (Broadcast Dashboard)</p>
          </div>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            ផ្សព្វផ្សាយដំណឹងថ្មី (Broadcast Message)
          </h2>
          
          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">អត្ថបទដំណឹង</label>
              <textarea
                rows={5}
                className="w-full rounded-lg border border-slate-300 p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="វាយបញ្ចូលសារដែលអ្នកចង់ផ្ញើទៅកាន់អ្នកប្រើប្រាស់គ្រប់គ្នា..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              ></textarea>
            </div>

            {status === 'error' && (
              <div className="p-4 rounded-lg bg-red-50 text-red-700 border border-red-100 flex items-start text-sm">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>បរាជ័យ៖</strong> {resultMessage} 
                  <p className="mt-2 text-xs font-semibold">សូមប្រាកដថា៖</p>
                  <ul className="list-disc leading-relaxed list-inside text-xs mt-1 space-y-1">
                    <li>រក្សាទុក NEXT_PUBLIC_SUPABASE_URL និង SUPABASE_SERVICE_ROLE_KEY លើយ Vercel។</li>
                    <li>បានកំណត់ SQL Schema រួចរាល់នៅក្នុង Supabase Editor។</li>
                  </ul>
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="p-4 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center text-sm">
                <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0 text-emerald-600" />
                <div>{resultMessage}</div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={status === 'loading' || !message.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium px-6 py-2.5 rounded-lg shadow-sm transition flex items-center"
              >
                {status === 'loading' ? 'កំពុងបញ្ជូន...' : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    បញ្ជូនសារ (Send to All)
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-sm text-slate-600">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
             <div className="w-6 h-6 bg-green-100 text-green-700 rounded flex justify-center items-center mr-2 text-xs font-bold">1</div>
             សេចក្តីណែនាំអំពី Supabase (តើត្រូវធ្វើដូចម្តេច?)
          </h3>
          <ol className="list-decimal list-inside space-y-3 pl-2">
            <li>បង្កើត Project នៅក្នុង <a href="https://supabase.com" target="_blank" className="text-blue-600 hover:underline">Supabase</a>។</li>
            <li>យកកូដពីក្នុង Folder <code className="bg-slate-100 px-2 py-1 rounded border border-slate-200 font-mono text-xs">supabase/schema.sql</code> ទៅ Run ក្នុង Supabase <strong>SQL Editor</strong> ដើម្បីបង្កើត Tables។</li>
            <li>យក <strong>Project URL</strong>, <strong>anon key</strong>, និង <strong>service_role secret</strong> ពី Supabase <strong>Project Settings &gt; API</strong>។</li>
            <li>ដាក់ចូលក្នុង Vercel Environment Variables: 
              <div className="mt-3 p-3 bg-slate-900 border border-slate-800 text-slate-100 rounded-lg font-mono text-xs overflow-x-auto space-y-1">
                <div>NEXT_PUBLIC_SUPABASE_URL=https://(your_url).supabase.co</div>
                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=ey... (ជាជម្រើស/សម្រាប់ថ្ងៃក្រោយ)</div>
                <div>SUPABASE_SERVICE_ROLE_KEY=ey...</div>
              </div>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
