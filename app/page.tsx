'use client';
import React, { useState } from 'react';
import { Bot, Layers, BookOpen, Send, Users, Shield, ArrowRight, Activity, Menu, X, Globe } from 'lucide-react';
import Link from 'next/link';

export default function TelegramBotLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const structureCode = `my-telegram-bot/
├── api/
│   └── bot.js      <- Serverless Function
├── package.json
└── .gitignore`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden scroll-smooth">
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Bot size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">BotManager</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Features</a>
            <a href="#docs" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Documentation</a>
            <Link href="/admin" className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg shadow-indigo-600/20 flex items-center gap-2">
              Admin Dashboard <ArrowRight size={16} />
            </Link>
          </div>

          <button className="md:hidden p-2 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 shadow-lg absolute w-full">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-slate-600">Features</a>
            <a href="#docs" onClick={() => setMobileMenuOpen(false)} className="text-base font-medium text-slate-600">Documentation</a>
            <Link href="/admin" className="text-base font-medium text-indigo-600 flex items-center gap-2">
              Admin Dashboard <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 max-w-7xl mx-auto text-center relative mt-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-indigo-400/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-widest mb-6">
          <Activity size={14} className="text-indigo-600 animate-pulse" />
          Serverless Ready
        </span>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.1]">
          Powerful Telegram Bots to<br className="hidden md:block"/> <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500">Transform Your Business</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Easily automate your marketing campaigns, broadcast messages, track users, and streamline community operations directly from a unified cloud dashboard.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/admin" className="w-full sm:w-auto text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-8 py-4 rounded-full transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2">
            Get started <ArrowRight size={18} />
          </Link>
          <a href="#docs" className="w-full sm:w-auto text-base font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 px-8 py-4 rounded-full transition-all flex items-center justify-center gap-2">
            <BookOpen size={18} /> View Documentation
          </a>
        </div>

        {/* Dashboard Mockup */}
        <div className="mt-20 relative max-w-5xl mx-auto">
          <div className="rounded-2xl border border-slate-200/50 bg-white/50 backdrop-blur-sm p-4 shadow-2xl">
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="h-12 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <div className="ml-4 h-6 w-48 bg-white border border-slate-200 rounded text-[10px] text-slate-400 flex items-center px-2">bot-admin.vercel.app</div>
              </div>
              <div className="p-8 grid md:grid-cols-3 gap-6 text-left">
                <div className="col-span-2 space-y-4">
                  <div className="h-6 w-48 bg-slate-100 rounded"></div>
                  <div className="h-24 w-full bg-slate-50 border border-slate-100 rounded-lg"></div>
                  <div className="h-10 w-32 bg-indigo-600 rounded-lg mt-2"></div>
                </div>
                <div className="space-y-4">
                  <div className="h-24 w-full bg-slate-50 border border-slate-100 rounded-lg"></div>
                  <div className="h-24 w-full bg-slate-50 border border-slate-100 rounded-lg"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Get the most out of our software</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">No matter what you need to orchestrate, our platform provides top-notch tools to help you manage your community and accelerate growth.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Send size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Marketing Bot</h3>
              <p className="text-slate-600 leading-relaxed">Easily automate your marketing campaigns, broadcast announcements, and directly engage with your Telegram audience using our smart broadcasting engine.</p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Customer Management</h3>
              <p className="text-slate-600 leading-relaxed">Powerful customer relationship management (CRM) integration using Supabase. Capture user details securely and track their interactions seamlessly.</p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Shield size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Serverless Scale</h3>
              <p className="text-slate-600 leading-relaxed">A cloud-based architecture built on Vercel Edge Runtime. It scales instantly to handle high-volume webhook requests without performance bottlenecks.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Developer Docs Section */}
      <section id="docs" className="py-24 px-6 bg-slate-900 text-slate-300">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Developer Setup & Documentation</h2>
            <p className="text-slate-400 text-lg">Everything you need to know about the technical architecture, deployment workflow, and database setup.</p>
          </div>

          <div className="space-y-8">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8">
              <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-4">
                <Layers className="text-indigo-400" /> 1. Project Folder Structure
              </h3>
              <p className="mb-6 text-slate-400 text-sm">Vercel automatically detects Serverless Functions exactly when they are inside an <code className="text-indigo-300">api/</code> directory. Keep the structure simple:</p>
              <div className="bg-[#0f111a] rounded-xl overflow-hidden border border-slate-700">
                <pre className="p-5 font-mono text-xs overflow-x-auto text-slate-300"><code>{structureCode}</code></pre>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8">
              <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-4">
                <Globe className="text-indigo-400" /> 2. Webhook Deployment Instructions
              </h3>
              <ol className="list-decimal list-inside space-y-4 text-sm text-slate-400 ml-2">
                <li><strong className="text-slate-200">Deploy to Vercel:</strong> Push this folder to GitHub and import it into Vercel.</li>
                <li><strong className="text-slate-200">Environment Variables:</strong> Add <code className="text-indigo-300">TELEGRAM_BOT_TOKEN</code> and <code className="text-indigo-300">TELEGRAM_ADMIN_GROUP_ID</code> in settings.</li>
                <li><strong className="text-slate-200">Set the Webhook:</strong> Since long polling doesn't work in Serverless, use this URL format in your browser:
                  <div className="mt-3 p-4 bg-[#0f111a] border border-slate-700 rounded-lg break-all font-mono text-xs text-indigo-400">
                    https://api.telegram.org/bot&lt;YOUR_BOT_TOKEN&gt;/setWebhook?url=https://&lt;YOUR_VERCEL_DOMAIN&gt;/api/bot
                  </div>
                </li>
              </ol>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 md:p-8">
              <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-4">
                <BookOpen className="text-indigo-400" /> 3. AI Knowledge Base Note
              </h3>
              <div className="space-y-4 text-sm">
                <p className="text-slate-400">ដោយសារតែរចនាសម្ព័ន្ធរបស់កម្មវិធីនេះជា <strong>Serverless</strong> នៅលើ Vercel, ការដាក់ឯកសារដើម្បីឲ្យ Bot រៀន (AI Knowledge Base) មានជម្រើសសំខាន់ៗ៖</p>
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="p-5 rounded-xl border border-slate-700 bg-slate-800/80">
                    <h4 className="font-bold text-white mb-2">Static Text / Prompts</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">ប្រើ <code className="text-indigo-300 px-1 py-0.5 rounded">fs.readFileSync</code> ដើម្បីអានឯកសារ <code className="text-indigo-300 px-1 py-0.5 rounded">.txt/.json</code> ក្នុងកូដ សម្រាប់ទិន្នន័យតូចៗ រួចបញ្ជូនទៅកាន់ LLM (Gemini) ជា context។</p>
                  </div>
                  <div className="p-5 rounded-xl border border-slate-700 bg-slate-800/80">
                    <h4 className="font-bold text-white mb-2">Vector Databases (RAG)</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">សម្រាប់ឯកសារធំៗ (PDFs, Docs), បំប្លែងទៅជា Embeddings ហើយរក្សាទុកក្នុង Supabase pgvector រួចទាញយកព័ត៌មានដែលពាក់ព័ន្ធនៅពេល Bot ឆ្លើយតប។</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 px-6 text-center bg-indigo-600 text-white relative overflow-hidden">
         <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
         <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-black opacity-20 rounded-full blur-3xl"></div>
         <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Ready to streamline your operations?</h2>
          <p className="text-indigo-100 text-lg md:text-xl mb-10">Deploy your custom Telegram bot and manage your audience straight from a comprehensive dashboard.</p>
          <Link href="/admin" className="inline-flex text-base font-semibold text-indigo-700 bg-white hover:bg-slate-50 px-8 py-4 rounded-full transition-all shadow-xl shadow-black/10 items-center justify-center gap-2">
            Go to Admin Dashboard <ArrowRight size={18} />
          </Link>
         </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-lg">
             <Bot size={24} className="text-indigo-600" /> BotManager
          </div>
          <p>© {new Date().getFullYear()} Telegram Bot Manager SaaS. Built with Next.js & Supabase.</p>
        </div>
      </footer>
    </div>
  );
}
