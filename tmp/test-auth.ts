import { insforge } from './src/services/insforge.ts';

async function test() {
  const email = 'test@example.com';
  const password = 'password123';
  
  // Try logging in explicitly so we get a session
  const { data: auth, error: authErr } = await insforge.auth.signInWithPassword({
    email, password
  });

  if (authErr) {
    console.error('Auth err:', authErr);
    // If not, we cannot test insert without auth.
  }
}
test();
