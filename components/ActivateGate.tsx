'use client';
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, IdCard, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import { ActiveEmployee, setActiveEmployee } from '@/lib/employeeStore';

interface Props {
  onActivated: (e: ActiveEmployee) => void;
}

export default function ActivateGate({ onActivated }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activate = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (!c) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/employees/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || 'រក Employee ID នេះមិនឃើញទេ។');
        setLoading(false);
        return;
      }
      const emp: ActiveEmployee = data.employee;
      setActiveEmployee(emp);
      onActivated(emp);
    } catch {
      setError('មានបញ្ហាបណ្ដាញ។ សូមសាកល្បងម្ដងទៀត។');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-ambient flex flex-col items-center justify-center px-6 py-10 font-sans text-slate-900">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-3xl brand-gradient flex items-center justify-center shadow-glow-brand mb-4 animate-float-slow">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SecureAttend</h1>
          <p className="text-sm text-slate-500 mt-1">ប្រព័ន្ធកត់ត្រាវត្តមានឌីជីថល</p>
        </div>

        <div className="bg-white rounded-3xl shadow-card border border-slate-100 p-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <IdCard className="w-5 h-5 text-brand-600" /> ភ្ជាប់គណនីបុគ្គលិក
          </h2>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            បញ្ចូល <strong>លេខបុគ្គលិក (Employee ID)</strong> ដែល Admin ផ្ដល់ឱ្យ ដើម្បីចាប់ផ្ដើម។
          </p>

          <form onSubmit={activate} className="mt-5 space-y-4">
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ឧ. EMP-001"
              className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none transition text-center text-lg font-bold tracking-wider uppercase"
            />

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm flex gap-2 items-start border border-red-100">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="font-medium leading-tight">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full brand-gradient disabled:opacity-50 text-white py-3.5 rounded-2xl font-bold shadow-glow-brand active:scale-95 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> កំពុងពិនិត្យ...</>
              ) : (
                <>បន្ត <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6 leading-relaxed">
          មិនមានលេខបុគ្គលិក? សូមទាក់ទងអ្នកគ្រប់គ្រង (Admin) របស់ស្ថាប័នអ្នក។
        </p>
      </motion.div>
    </div>
  );
}
