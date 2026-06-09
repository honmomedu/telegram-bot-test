// Minimal Telegram Bot API sender (server-side).
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
export const ADMIN_GROUP_ID =
  process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_ADMIN_GROUP_ID || '';

export async function sendTelegram(chatId: string | number, text: string): Promise<boolean> {
  if (!BOT_TOKEN || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
