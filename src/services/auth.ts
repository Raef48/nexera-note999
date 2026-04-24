const AUTH_STORAGE_KEY = 'aura_user';
const AUTH_CHANGE_EVENT = 'aura-auth-changed';

export interface StoredUser {
  id?: string;
  email?: string;
  full_name?: string | null;
  [key: string]: unknown;
}

export function getStoredUser(): StoredUser | null {
  try {
    const rawUser = localStorage.getItem(AUTH_STORAGE_KEY);
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    console.error('Error parsing stored user:', error);
    return null;
  }
}

export function isStoredUserAuthenticated(user: StoredUser | null): boolean {
  return Boolean(user?.id && !user.id.toString().startsWith('demo-'));
}

export function setStoredUser(user: StoredUser) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function clearStoredUser() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function subscribeToAuthChanges(callback: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === AUTH_STORAGE_KEY) {
      callback();
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(AUTH_CHANGE_EVENT, callback);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(AUTH_CHANGE_EVENT, callback);
  };
}
