import { NextRequest, NextResponse } from 'next/server';
import { Telegraf } from 'telegraf';
import { supabase } from '@/lib/supabase';

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new Telegraf(token || 'fallback');

export async function POST(req: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Supabase credentials are not configured.' }, { status: 500 });
  }

  try {
    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: 'Message payload is required.' }, { status: 400 });

    // 1. Fetch all users from Supabase
    const { data: users, error: dbError } = await supabase.from('telegram_users').select('telegram_id');
    
    if (dbError) throw new Error(dbError.message);
    if (!users || users.length === 0) return NextResponse.json({ error: 'មិនមានអ្នកប្រើប្រាស់ណាមួយនៅក្នុង Database ឡើយ។' }, { status: 400 });

    // 2. Broadcast to all users
    let successCount = 0;
    for (const user of users) {
      try {
        await bot.telegram.sendMessage(user.telegram_id, message);
        successCount++;
      } catch (err: any) {
        console.error(`Failed to send to ${user.telegram_id}:`, err.message);
        // Ignore individual fails, as users may have blocked the bot
      }
    }

    // 3. Save broadcast history
    await supabase.from('broadcast_history').insert({
      message,
      target_count: users.length,
      success_count: successCount
    });

    return NextResponse.json({ success: true, total: users.length, successCount });
  } catch (err: any) {
    console.error('Broadcast error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
