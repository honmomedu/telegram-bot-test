import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { DEFAULT_ORG_SLUG } from '@/lib/org';

// Admin access:
//   - Per-organization password (organizations.admin_password) when an org slug
//     is provided (multi-tenant).
//   - Global ADMIN_PASSWORD / ADMIN_TELEGRAM_ID for the default org (legacy).
export async function POST(req: Request) {
  try {
    const { telegramId, password, org } = await req.json().catch(() => ({}));
    const slug = (org || DEFAULT_ORG_SLUG).toString();

    // Per-org password (when org is not the default)
    if (password != null && password !== '' && slug && slug !== DEFAULT_ORG_SLUG) {
      try {
        const { data } = await supabase.from('organizations').select('admin_password, active').eq('slug', slug).single();
        if (!data) return NextResponse.json({ isAdmin: false, message: 'រកស្ថាប័នមិនឃើញ។' });
        if (data.active === false) return NextResponse.json({ isAdmin: false, message: 'ស្ថាប័ននេះត្រូវបានបិទ។' });
        if (password === (data.admin_password || 'admin123')) {
          return NextResponse.json({ isAdmin: true, via: 'org-password', org: slug });
        }
        return NextResponse.json({ isAdmin: false, message: 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវ។' });
      } catch {
        return NextResponse.json({ isAdmin: false, message: 'មានបញ្ហាផ្ទៀងផ្ទាត់។' });
      }
    }

    // Legacy / default org
    const adminId = process.env.ADMIN_TELEGRAM_ID;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hasAnyAuth = !!adminId || !!process.env.ADMIN_PASSWORD;

    if (password != null && password !== '') {
      // Allow default-org global password, OR fall through to the default org row
      if (password === adminPassword) return NextResponse.json({ isAdmin: true, via: 'password', org: DEFAULT_ORG_SLUG });
      try {
        const { data } = await supabase.from('organizations').select('admin_password').eq('slug', DEFAULT_ORG_SLUG).single();
        if (data && password === data.admin_password) return NextResponse.json({ isAdmin: true, via: 'org-password', org: DEFAULT_ORG_SLUG });
      } catch { /* ignore */ }
      return NextResponse.json({ isAdmin: false, message: 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវ។' });
    }

    if (telegramId && adminId && telegramId.toString() === adminId.toString()) {
      return NextResponse.json({ isAdmin: true, via: 'telegram', org: DEFAULT_ORG_SLUG });
    }

    if (!hasAnyAuth) {
      return NextResponse.json({ isAdmin: true, via: 'open', org: DEFAULT_ORG_SLUG, _warning: 'No ADMIN_PASSWORD/ADMIN_TELEGRAM_ID set.' });
    }

    return NextResponse.json({ isAdmin: false, requiresLogin: true });
  } catch (error: any) {
    return NextResponse.json({ isAdmin: false, error: error.message }, { status: 500 });
  }
}
