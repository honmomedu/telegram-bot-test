import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { employeeName, actionType, time, distance } = data;
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || '';

    let isMock = false;

    if (!botToken || !adminChatId) {
       console.log("Mock Telegram Notification Sent: ", { employeeName, actionType, time });
       isMock = true;
       // We'll just return early in dev mode to simulate
       return NextResponse.json({ success: true, _mock: isMock, message: 'Simulated telegram sending (missing tokens in .env.example)' });
    }

    const url = new URL(req.url);
    const origin = `${url.protocol}//${url.host}`;
    const textMessage = `🔔 *ការជូនដំណឹងអំពីវត្តមាន!* \n\n👤 *បុគ្គលិក:* ${employeeName || 'Unknown'}\n📍 *ប្រភេទ:* ${actionType === 'IN' ? 'ចូលធ្វើការ (Check IN)' : 'ចេញពីធ្វើការ (Check OUT)'}\n⏱ *ម៉ោង:* ${new Date(time).toLocaleString('km-KH')}\n🧭 *ចម្ងាយពីទីស្នាក់ការ:* ${distance}m\n\n🔗 [ចូលប្រព័ន្ធគ្រប់គ្រង (Admin)](${origin}/admin)\n[ប្រព័ន្ធកំណត់ត្រា SecureAttend]`;
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: textMessage,
        parse_mode: 'Markdown'
      })
    });

    if (!response.ok) {
        throw new Error('Failed to send telegram message. Please check token/chat IDs.');
    }

    return NextResponse.json({ success: true, _mock: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
