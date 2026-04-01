import { createClient } from '@supabase/supabase-js';

const url = 'https://5jt6gued.ap-southeast.insforge.app';
const key = 'ik_af506c7036b8cb1e5e20c73f30e9ee6f'; 

const supabase = createClient(url, key);

async function testFrontendOperations() {
  const email = `test_${Date.now()}@example.com`;
  const password = 'password123';
  
  console.log('Signing up:', email);
  const { data: auth, error: authErr } = await supabase.auth.signUp({
    email, password
  });

  if (authErr) {
    console.error('Auth Error:', authErr);
    return;
  }

  const userId = auth?.user?.id;
  console.log('Got User ID:', userId);

  if (!userId) {
    console.error('No user ID returned. Cannot test RLS.');
    return;
  }

  console.log('Testing Profile Upsert...');
  const { data: pData, error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: 'Test Profile',
    avatar_url: 'https://example.com/avatar.png'
  }).select().single();
  
  if (profileError) {
    console.error('Profile Upsert Failed:', profileError);
  } else {
    console.log('Profile Upsert Success:', pData);
  }

  console.log('Testing Notes Upsert...');
  const { data: nData, error: noteError } = await supabase.from('notes').upsert({
    user_id: userId,
    title: 'Test Note from Script',
    content: 'This note was inserted automatically'
  }).select().single();

  if (noteError) {
    console.error('Note Upsert Failed:', noteError);
  } else {
    console.log('Note Upsert Success:', nData);
  }
}

testFrontendOperations();
