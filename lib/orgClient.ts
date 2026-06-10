// Client-side org context. The org slug is taken from the ?org= URL param
// (provided by the Owner's links) or remembered in localStorage, and mirrored
// into an `org` cookie so every same-origin API request is scoped automatically.

export const DEFAULT_ORG_SLUG = 'default';
const LS_KEY = 'secure_attend_org';

export function getOrgSlug(): string {
  if (typeof window === 'undefined') return DEFAULT_ORG_SLUG;
  try {
    const fromUrl = new URL(window.location.href).searchParams.get('org');
    if (fromUrl) return fromUrl;
    return localStorage.getItem(LS_KEY) || DEFAULT_ORG_SLUG;
  } catch {
    return DEFAULT_ORG_SLUG;
  }
}

export function setOrgContext(slug: string): void {
  if (typeof document === 'undefined') return;
  const s = slug || DEFAULT_ORG_SLUG;
  document.cookie = `org=${encodeURIComponent(s)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  try { localStorage.setItem(LS_KEY, s); } catch { /* ignore */ }
}

/** Read ?org= (if any), persist it as the active org, and return the slug. */
export function initOrgContext(): string {
  const slug = getOrgSlug();
  setOrgContext(slug);
  return slug;
}
