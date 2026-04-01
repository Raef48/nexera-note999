import { createClient } from '@insforge/sdk';
import dotenv from 'dotenv';

dotenv.config();

const insforgeUrl = process.env.VITE_INSFORGE_URL;
const insforgeAnonKey = process.env.VITE_INSFORGE_ANON_KEY;

if (!insforgeUrl || !insforgeAnonKey) {
  throw new Error('Insforge credentials not configured in environment');
}

export const insforge = createClient({
  baseUrl: insforgeUrl,
  anonKey: insforgeAnonKey
});
