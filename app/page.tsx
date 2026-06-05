import React from 'react';
import { Terminal, FileCode, CheckCircle2, Bot, Globe, Layers, BookOpen } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Telegraf Serverless Setup',
};

const SectionHeading = ({ title, icon: Icon }: { title: string; icon: React.ElementType }) => (
  <h2 className="flex items-center text-lg font-bold tracking-tight mb-4 text-slate-900 border-b border-slate-100 pb-3">
    <Icon className="w-5 h-5 mr-3 text-blue-600" />
    {title}
  </h2>
);

const CodeSnippet = ({ code, language, filename }: { code: string; language: string; filename?: string }) => {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 relative group mt-4">
      <div className="flex h-10 items-center justify-between border-b border-slate-800 bg-slate-800 px-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/80"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80"></div>
          </div>
          {filename && <span className="ml-4 text-xs font-medium text-slate-400">{filename}</span>}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="text-[10px] font-bold text-blue-400 uppercase tracking-widest hover:text-blue-300">Copy Code</button>
        </div>
      </div>
      <pre className="p-6 overflow-x-auto text-[13px] font-mono leading-relaxed text-slate-300">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default function TelegramBotDocs() {
  const structureCode = `my-telegram-bot/
â”œâ”€â”€ api/
â”‚   â””â”€â”€ bot.js      <- Serverless Function
â”œâ”€â”€ package.json
â””â”€â”€ .gitignore`;

  const packageJsonCode = `{
  "name": "my-telegram-bot",
  "version": "1.0.0",
  "description": "Serverless Telegram Bot using Vercel",
  "main": "api/bot.js",
  "scripts": {
    "start": "node api/bot.js"
  },
  "dependencies": {
    "telegraf": "^4.16.3"
  }
}`;

  const botJsCode = `const { Telegraf, Markup } = require('telegraf');

// Initialize the Telegram Bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ADMIN_GROUP_ID = process.env.TELEGRAM_ADMIN_GROUP_ID;

// Basic Commands & Replies with Buttons
bot.start(async (ctx) => {
  await ctx.reply(
    'សួស្តី! សូមស្វាគមន៍មកកាន់ Bot របស់យើង។',
    Markup.inlineKeyboard([
      [Markup.button.callback('ℹ️ អំពីយើង', 'about')],
      [Markup.button.url('🌐 ចូលទៅកាន់វិបសាយ', 'https://google.com')]
    ])
  );
});

bot.action('about', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('យើងជាក្រុមអ្នកអភិវឌ្ឍន៍ជំនាញ។ 🚀');
});

bot.hears(['សួស្តី', 'hi', 'hello'], async (ctx) => {
  await ctx.reply('សួស្តី! តើមានអ្វីឱ្យខ្ញុំជួយទេថ្ងៃនេះ?');
});

bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id.toString();
  const text = ctx.message.text;

  // 1. Admin Group Features
  if (chatId === ADMIN_GROUP_ID) {
    // Broadcast Feature (Note: database required to track all users)
    if (text.startsWith('/broadcast ')) {
      const msg = text.replace('/broadcast ', '');
      return ctx.reply('Broadcast requested: ' + msg + '\\n(Note: Connect a Redis/KV DB to store user IDs to fully implement this)');
    }

    // Admin Reply to User
    if (ctx.message.reply_to_message) {
      const repliedMsg = ctx.message.reply_to_message;
      // Extract original user ID from the report text
      const match = repliedMsg.text && repliedMsg.text.match(/\\(ID: (\\d+)\\)/);
      if (match && match[1]) {
        await bot.telegram.sendMessage(match[1], \`Admin replied:\\n\\n\${text}\`);
      }
    }
    return;
  }

  // 2. Normal User Feature (Reporting)
  if (ctx.chat.type === 'private') {
    const user = ctx.from;
    const report = \`New message from \${user.first_name} (ID: \${user.id}):\\n\\n\${text}\`;
    
    // Forward (Report) to Admin
    await bot.telegram.sendMessage(ADMIN_GROUP_ID, report);
    await ctx.reply('Your message has been sent to the admins.');
  }
});

// Main Vercel Serverless Function Export
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body, res);
    } else {
      res.status(200).json({ status: 'Bot webhook is listening!' });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Server Error');
  }
};`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 sm:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between border bg-white px-8 py-6 rounded-xl shadow-sm space-y-4 sm:space-y-0">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Bot size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Vercel Telegram <span className="text-blue-600">Setup</span></h1>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-0.5">
                Deployment Manager
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              Serverless Ready
            </div>
            <p className="text-[11px] text-slate-400 max-w-xs text-left sm:text-right">
              A comprehensive guide and code structure for deploying a Telegraf-based webhook bot using Vercel Serverless Functions.
            </p>
            <a href="/admin" className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 mt-2 rounded-lg transition border border-blue-100 flex items-center shadow-sm">
               &rarr; ចូលទៅកាន់ Admin Dashboard
            </a>
          </div>
        </header>

        {/* Feature Overview */}
        <section className="grid sm:grid-cols-2 gap-6">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-500 uppercase flex items-center mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
              Reporting
            </h3>
            <p className="text-[13px] text-slate-600 leading-relaxed">
              Users private messages are natively intercepted and forwarded to the designated Admin Telegram group as a formatted report.
            </p>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-500 uppercase flex items-center mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
              Broadcasting & Replies
            </h3>
            <p className="text-[13px] text-slate-600 leading-relaxed">
              Admins can reply directly to the bot's forwarded reports in the group, routing the message precisely back to the original user.
            </p>
          </div>
        </section>

        {/* 1. Project Structure */}
        <section className="rounded-xl border bg-white p-6 sm:p-8 shadow-sm">
          <SectionHeading title="1. Project Folder Structure" icon={Layers} />
          <p className="text-[13px] text-slate-600 leading-relaxed mb-4 whitespace-pre-wrap">
            Vercel automatically detects Serverless Functions exactly when they are inside an <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-xs border border-slate-200">api/</code> directory. Keep the structure simple:
          </p>
          <CodeSnippet code={structureCode} language="bash" filename="Project Structure" />
        </section>

        {/* 2. Package.json */}
        <section className="rounded-xl border bg-white p-6 sm:p-8 shadow-sm">
          <SectionHeading title="2. Configuration" icon={FileCode} />
          <p className="text-[13px] text-slate-600 leading-relaxed mb-4">
            Initialize your project and make sure to list <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-xs border border-slate-200">telegraf</code> as a dependency so Vercel installs it automatically.
          </p>
          <CodeSnippet code={packageJsonCode} language="json" filename="package.json" />
        </section>

        {/* 3. Bot Source Code */}
        <section className="rounded-xl border bg-white p-6 sm:p-8 shadow-sm">
          <SectionHeading title="3. Main Endpoint" icon={Terminal} />
          <p className="text-[13px] text-slate-600 leading-relaxed mb-4">
            This serverless function intercepts incoming Telegram webhooks and processes the bot logic via Telegraf. 
            Remember to configure <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-xs border border-slate-200">TELEGRAM_BOT_TOKEN</code> and <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-xs border border-slate-200">TELEGRAM_ADMIN_GROUP_ID</code> in Vercel settings.
          </p>
          <CodeSnippet code={botJsCode} language="javascript" filename="api/bot.js" />
        </section>

        {/* 4. Deployment & Webhook setup */}
        <section className="rounded-xl border bg-white p-6 sm:p-8 shadow-sm">
          <SectionHeading title="4. Webhook Deployment Instructions" icon={Globe} />
          <div className="space-y-4 text-[13px] text-slate-600 leading-relaxed">
            <ol className="list-decimal list-inside space-y-4 ml-2">
              <li>
                <strong className="text-slate-800">Deploy to Vercel:</strong> Push this folder to GitHub and import it into Vercel. Vercel will process the <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-xs border border-slate-200">api/</code> folder automatically.
              </li>
              <li>
                <strong className="text-slate-800">Add Environment Variables:</strong> Go to your Vercel Project Settings {">"} Environment Variables. Add <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-xs border border-slate-200">TELEGRAM_BOT_TOKEN</code> (from @BotFather) and <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-xs border border-slate-200">TELEGRAM_ADMIN_GROUP_ID</code>.
              </li>
              <li>
                <strong className="text-slate-800">Find Your Vercel Domain:</strong> Once deployed, Vercel gives you a URL like <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-xs border border-slate-200">https://my-telegram-bot.vercel.app</code>.
              </li>
              <li>
                <strong className="text-slate-800">Set the Telegram Webhook:</strong> Since long polling doesn't work in Serverless, you must tell Telegram where to send updates. Open your web browser and visit this URL (replace with your token and URL):
                <div className="mt-3 p-3 bg-slate-100 border border-slate-200 rounded-md break-all font-mono text-xs text-blue-700">
                  https://api.telegram.org/bot&lt;YOUR_BOT_TOKEN&gt;/setWebhook?url=https://&lt;YOUR_VERCEL_DOMAIN&gt;/api/bot
                </div>
              </li>
            </ol>
            <div className="mt-6 p-4 bg-orange-50 border border-orange-100 rounded-lg text-orange-800 shadow-sm">
              <strong className="font-semibold">Note on Broadcasting:</strong> Sending a <code className="bg-orange-100 px-1 py-0.5 rounded border border-orange-200">/broadcast</code> to all historical users requires persisting their IDs outside memory (since serverless functions shut down). We highly recommend attaching Vercel KV or a Postgres database to store the User IDs when they start using the bot.
            </div>
          </div>
        </section>

        {/* 5. Document / AI Knowledge Base Note */}
        <section className="rounded-xl border bg-white p-6 sm:p-8 shadow-sm">
          <SectionHeading title="5. Adding Documents for AI Learning (Knowledge Base)" icon={BookOpen} />
          <div className="space-y-4 text-[13px] text-slate-600 leading-relaxed">
            <p>
              ដោយសារតែរចនាសម្ព័ន្ធរបស់កម្មវិធីនេះជា <strong>Serverless</strong> នៅលើ Vercel, ការដាក់ឯកសារដើម្បីឲ្យ Bot រៀន (AI Knowledge Base) មានជម្រើស ២ សំខាន់ៗ៖
            </p>
            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                <h4 className="font-semibold text-slate-800 text-sm mb-1">១. ឯកសារទំហំតូច (Static Text/JSON / System Prompts)</h4>
                <p>
                  អ្នកអាចបង្កើត Folder មួយឈ្មោះថា <code className="bg-slate-200 text-slate-700 px-1 py-0.5 rounded text-xs border border-slate-300">knowledge/</code> នៅក្នុង Project។ ដាក់ឯកសារជាទម្រង់ <code className="bg-slate-200 text-slate-700 px-1 py-0.5 rounded text-xs border border-slate-300">.txt</code> ឬ <code className="bg-slate-200 text-slate-700 px-1 py-0.5 rounded text-xs border border-slate-300">.json</code> រួចអានឯកសារនោះដោយប្រើប្រាស់ <code className="bg-slate-200 text-slate-700 px-1 py-0.5 rounded text-xs border border-slate-300">fs.readFileSync</code> ហើយភ្ជាប់វាទៅកាន់ AI (ដូចជា Google Gemini API) ដើម្បីឲ្យវាឆ្លើយតបយោងតាមឯកសារនោះ។
                </p>
              </div>
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                <h4 className="font-semibold text-slate-800 text-sm mb-1">២. ឯកសារធំៗ ឬច្រើន (PDFs, Docs) - ប្រើប្រាស់ RAG</h4>
                <p>
                  ប្រសិនបើឯកសារមានច្រើន អ្នកមិនអាចទុកវានៅក្នុងកូដបានទេ។ អ្នកត្រូវបំប្លែងឯកសារទាំងនោះទៅជា Vectors (Embeddings) ហើយរក្សាទុកទៅក្នុង Vector Database (ឧទាហរណ៍៖ Pinecone, Supabase pgvector ឬ Firebase Extensions)។ ពេលអ្នកប្រើសួរសំណួរ, Bot នឹងស្វែងរកព័ត៌មានពាក់ព័ន្ធពី Database រួចទើបបញ្ជូនឲ្យ Gemini បង្កើតចម្លើយចេញមក។
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
