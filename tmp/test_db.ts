import { createClient } from '@supabase/supabase-js';

const url = 'https://5jt6gued.ap-southeast.insforge.app';
const key = 'ik_af506c7036b8cb1e5e20c73f30e9ee6f'; // Assuming this is VITE_INSFORGE_API_KEY from .env

const supabase = createClient(url, key);

async function check() {
  const email = 'test@example.com';
  const password = 'password123';
  
  // Try logging in to get 
  // Let's create an anonymous user or login if possible:
  const { data: signData, error: signError } = await supabase.auth.signUp({
    email, password
  });

  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email, password
  });

  const userId = auth?.user?.id || signData?.user?.id;
  console.log('User id:', userId);

  if (!userId) {
    console.log('Auth error:', authErr || signError);
    return;
  }

  console.log('Testing profiles insert...');
  const { data: pData, error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: 'Test Profile'
  });
  console.log('Profile insert result:', pData, 'error:', profileError);

  console.log('Testing notes insert...');
  const { data: nData, error: noteError } = await supabase.from('notes').upsert({
    id: '00000000-0000-0000-0000-000000000001',
    user_id: userId,
    title: 'test note',
    content: 'test content'
  });
  console.log('Note insert result:', nData, 'error:', noteError);
}

check();
