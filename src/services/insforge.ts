import { createClient } from '@insforge/sdk';

const insforgeUrl = (import.meta as any).env.VITE_INSFORGE_URL;
const insforgeAnonKey = (import.meta as any).env.VITE_INSFORGE_ANON_KEY;

export const insforge = createClient({
  baseUrl: insforgeUrl,
  anonKey: insforgeAnonKey
});
