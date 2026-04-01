import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_INSFORGE_URL || '';
const key = process.env.VITE_INSFORGE_API_KEY || '';

const supabase = createClient(url, key);

async function check() {
  const { data: { user } } = await supabase.auth.getUser();
  console.log('User id:', user?.id);

  console.log('Testing notes... (requires auth context which is tricky in node without session, falling back to anon access test if possible)');
  
  const { error: profileError } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profile select error:', profileError);

  const { error: noteError } = await supabase.from('notes').select('*').limit(1);
  console.log('Notes select error:', noteError);
}

check();
