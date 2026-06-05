import { Telegraf, Context } from 'telegraf';
import { NextRequest, NextResponse } from 'next/server';

// Initialize the Telegram Bot. Use a fallback token to prevent initialization crashes during previews.
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new Telegraf(token || '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11');
const ADMIN_GROUP_ID = process.env.TELEGRAM_ADMIN_GROUP_ID || '';

// Basic Commands & Auto-Replies
bot.start((ctx) => {
  ctx.reply('សួស្តី! សូមស្វាគមន៍មកកាន់ Bot របស់យើង។ សូមវាយបញ្ចូនពាក្យ ឬសំណួររបស់អ្នកនៅទីនេះរូម Admin នឹងឆ្លើយតប។');
});

bot.help((ctx) => {
  ctx.reply('ផ្ញើសារអ្វីក៏បានមកកាន់ខ្ញុំ Admin នឹងទាក់ទងទៅអ្នកវិញនៅពេលក្រោយ។');
});

bot.hears(['សួស្តី', 'hi', 'hello', 'សួរស្ដី'], (ctx) => {
  ctx.reply('សួស្តី! តើមានអ្វីឱ្យខ្ញុំជួយទេថ្ងៃនេះ?');
});

bot.on('text', async (ctx: Context) => {
  if (!ctx.message || !('text' in ctx.message)) return;

  const chatId = ctx.chat?.id.toString();
  const text = ctx.message.text;

  // 1. Admin Group Logic
  if (chatId === ADMIN_GROUP_ID) {
    // 1a. Handle /broadcast
    if (text.startsWith('/broadcast ')) {
      const broadcastMsg = text.replace('/broadcast ', '');
      // Broadcast to ALL users requires a database (e.g., Redis, Vercel KV) to store user IDs.
      // E.g., await db.getAllUsers().forEach(userId => bot.telegram.sendMessage(userId, broadcastMsg));
      return ctx.reply('Broadcast feature requires a persistent database to store normal user IDs. This is a template.');
    }

    // 1b. Handle Admin Reply to a user's forwarded/reported message
    if ('reply_to_message' in ctx.message && ctx.message.reply_to_message) {
      const repliedMsg = ctx.message.reply_to_message;
      if ('text' in repliedMsg) {
         // Extract the User ID from the bot's formatted report
         // Assuming the bot sent: "New message from Name (ID: 123456):\n\n..."
         const match = repliedMsg.text.match(/\(ID: (\d+)\)/);
         if (match && match[1]) {
           const userId = match[1];
           await bot.telegram.sendMessage(userId, `Admin Reply:\n\n${text}`);
           return;
         }
      }
    }
  }

  // 2. Normal User Logic (Reporting to Admin)
  if (ctx.chat?.type === 'private') {
    if (!ADMIN_GROUP_ID) {
      await ctx.reply('Bot is currently under maintenance (Admin Group not set).');
      return;
    }
    
    const user = ctx.from;
    const report = `New message from ${user?.first_name} ${user?.last_name || ''} (ID: ${user?.id}):\n\n${text}`;

    await bot.telegram.sendMessage(ADMIN_GROUP_ID, report);
    await ctx.reply('Your message has been sent to the admins. We will reply as soon as possible.');
  }
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN is missing' }, { status: 500 });
    }
    const body = await req.json();
    await bot.handleUpdate(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Webhook payload error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Telegraf Serverless Bot is active on this endpoint.' });
}
