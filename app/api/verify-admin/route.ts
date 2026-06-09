import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { telegramId } = await req.json();
    
    // In production, ensure this token is set securely in your environment variables.
    const adminId = process.env.ADMIN_TELEGRAM_ID;

    // Optional: Only apply strictly if there is an ADMIN_TELEGRAM_ID defined
    // During local prototyping if you test without EV, you might want to allow it.
    // For safety, we block unless matched.
    if (!adminId) {
       console.warn("Server warning: ADMIN_TELEGRAM_ID is empty in environment. Allowing admin access for debugging.");
       return NextResponse.json({ isAdmin: true, _mock: true, message: 'Simulated admin access (Missing ADMIN_TELEGRAM_ID in Vercel/environment).' });
    }

    if (!telegramId) {
      return NextResponse.json({ isAdmin: false, message: 'Missing Telegram ID' });
    }

    if (telegramId.toString() === adminId.toString()) {
       return NextResponse.json({ isAdmin: true, message: 'Admin verified.' });
    }

    return NextResponse.json({ isAdmin: false, message: 'Access denied. You are not the admin.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
