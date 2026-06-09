// Client-side coordinator for face enrollments across localStorage (always)
// and Supabase cloud (optional, user's choice).

export interface FaceEnrollment {
  userId: string;
  name: string;
  descriptor: number[]; // 128 floats
  photo: string; // dataURL thumbnail
  createdAt: string;
  syncedToCloud?: boolean;
}

const KEY_PREFIX = 'secure_attend_face_v1:';

function keyFor(userId: string) {
  return KEY_PREFIX + (userId || 'guest');
}

export function getLocalEnrollment(userId: string): FaceEnrollment | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(keyFor(userId));
    return raw ? (JSON.parse(raw) as FaceEnrollment) : null;
  } catch {
    return null;
  }
}

export function saveLocalEnrollment(rec: FaceEnrollment): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(keyFor(rec.userId), JSON.stringify(rec));
  } catch (e) {
    console.error('Failed to save face enrollment locally:', e);
  }
}

export function removeLocalEnrollment(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    /* ignore */
  }
}

/** Push an enrollment to Supabase. Returns true when stored in the cloud. */
export async function saveCloudEnrollment(rec: FaceEnrollment): Promise<boolean> {
  try {
    const res = await fetch('/api/face-enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: rec.userId,
        name: rec.name,
        descriptor: rec.descriptor,
        photo: rec.photo,
      }),
    });
    const data = await res.json();
    return !!data.savedToCloud;
  } catch {
    return false;
  }
}

/** Fetch an enrollment from Supabase, normalised to FaceEnrollment shape. */
export async function fetchCloudEnrollment(userId: string): Promise<FaceEnrollment | null> {
  try {
    const res = await fetch(`/api/face-enroll?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    if (!data?.enrollment) return null;
    const e = data.enrollment;
    return {
      userId: e.user_id,
      name: e.name || '',
      descriptor: e.descriptor,
      photo: e.photo || '',
      createdAt: e.created_at || new Date().toISOString(),
      syncedToCloud: true,
    };
  } catch {
    return null;
  }
}

export async function deleteCloudEnrollment(userId: string): Promise<void> {
  try {
    await fetch(`/api/face-enroll?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
  } catch {
    /* ignore */
  }
}

/**
 * Resolve the active enrollment for a user: prefer cloud (cross-device),
 * fall back to local. Caches a cloud hit back into localStorage.
 */
export async function resolveEnrollment(userId: string): Promise<FaceEnrollment | null> {
  const local = getLocalEnrollment(userId);
  const cloud = await fetchCloudEnrollment(userId);
  if (cloud) {
    saveLocalEnrollment(cloud);
    return cloud;
  }
  return local;
}
