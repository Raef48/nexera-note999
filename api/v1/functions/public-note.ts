import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@insforge/sdk';

const createInsforgeClient = () => {
  const url = process.env.VITE_INSFORGE_URL;
  const accessKey =
    process.env.INSFORGE_SERVICE_KEY ||
    process.env.INSFORGE_SERVICE_ROLE_KEY ||
    process.env.INSFORGE_API_KEY ||
    process.env.VITE_INSFORGE_API_KEY ||
    process.env.VITE_INSFORGE_ANON_KEY;

  if (!url || !accessKey) {
    throw new Error('InsForge credentials not configured');
  }

  return createClient({
    baseUrl: url,
    anonKey: accessKey,
  });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const slug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';

    if (!slug) {
      return res.status(400).json({ error: 'Missing slug' });
    }

    const insforge = createInsforgeClient();
    const { data, error } = await insforge.database
      .from('notes')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Note not found' });
    }

    return res.status(200).json({ note: data });
  } catch (error: any) {
    console.error('Public note fetch error:', error);
    return res.status(500).json({
      error: 'Failed to load note',
      message: error.message || 'Unknown error',
    });
  }
}
