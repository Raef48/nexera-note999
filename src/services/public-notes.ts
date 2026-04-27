import type { Note } from './db';

const getApiBaseUrl = () => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
  const isLocalhost = backendUrl.includes('localhost');

  if (import.meta.env.PROD || isLocalhost || !backendUrl) {
    return '';
  }

  return backendUrl;
};

const API_BASE_URL = getApiBaseUrl();

export async function fetchPublicNoteBySlug(slug: string): Promise<Note | null> {
  const response = await fetch(`${API_BASE_URL}/api/v1/functions/public-note?slug=${encodeURIComponent(slug)}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message || 'Failed to load shared note');
  }

  const payload = await response.json();
  return payload.note ?? null;
}
