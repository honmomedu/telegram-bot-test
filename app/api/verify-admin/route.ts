import { NextResponse } from 'next/server';

// Admin access can be granted two ways:
//   1) Password login (works in any browser) — ADMIN_PASSWORD
//   2) Telegram WebApp identity — ADMIN_TELEGRAM_ID
// If NEITHER is configured, access is allowed (debug/first-run convenience).
export async function POST(req: Request) {
  try {
    const { telegramId, password } = await req.json().catch(() => ({}));

    const adminId = process.env.ADMIN_TELEGRAM_ID;
    // Default password so a fresh deploy is usable; CHANGE via env on Vercel.
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hasAnyAuth = !!adminId || !!process.env.ADMIN_PASSWORD;

    // Password path (browser login)
    if (password != null && password !== '') {
      if (password === adminPassword) {
        return NextResponse.json({ isAdmin: true, via: 'password' });
      }
      return NextResponse.json({ isAdmin: false, message: 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវ។' });
    }

    // Telegram path (auto inside the Mini App)
    if (telegramId && adminId && telegramId.toString() === adminId.toString()) {
      return NextResponse.json({ isAdmin: true, via: 'telegram' });
    }

    // First-run convenience: nothing configured at all -> allow
    if (!hasAnyAuth) {
      return NextResponse.json({ isAdmin: true, via: 'open', _warning: 'No ADMIN_PASSWORD/ADMIN_TELEGRAM_ID set.' });
    }

    // Otherwise require an explicit login
    return NextResponse.json({ isAdmin: false, requiresLogin: true });
  } catch (error: any) {
    return NextResponse.json({ isAdmin: false, error: error.message }, { status: 500 });
  }
}
