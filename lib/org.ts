import { supabase } from './supabase';

// Multi-tenant context. The active organization is carried in an `org`
// cookie (slug). Everything defaults to the 'default' org so existing
// single-tenant data and callers keep working unchanged.

export const DEFAULT_ORG_SLUG = 'default';

const slugToId = new Map<string, string>();

export function orgSlugFromReq(req: Request): string {
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)org=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : DEFAULT_ORG_SLUG;
}

export async function resolveOrgId(slug: string): Promise<string | null> {
  const s = slug || DEFAULT_ORG_SLUG;
  if (slugToId.has(s)) return slugToId.get(s)!;
  try {
    const { data } = await supabase.from('organizations').select('id, active').eq('slug', s).single();
    if (data?.id) {
      slugToId.set(s, data.id);
      return data.id;
    }
  } catch {
    /* table may not exist yet (pre-migration) */
  }
  return null;
}

/** Resolve the org_id for the current request (from the `org` cookie). */
export async function orgIdFromReq(req: Request): Promise<string | null> {
  return resolveOrgId(orgSlugFromReq(req));
}
