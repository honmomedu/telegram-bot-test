// Device-level "logged in" employee. Identity is the employee `code`
// (stable across Telegram account changes), not the Telegram user id.

export interface ActiveEmployee {
  code: string;
  name: string;
  department?: string | null;
}

const KEY = 'secure_attend_employee_v1';

export function getActiveEmployee(): ActiveEmployee | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActiveEmployee) : null;
  } catch {
    return null;
  }
}

export function setActiveEmployee(e: ActiveEmployee): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(e));
  } catch {
    /* ignore */
  }
}

export function clearActiveEmployee(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
