import { createClient } from '@supabase/supabase-js';

const insforgeUrl = 'https://5jt6gued.ap-southeast.supabase.co';
const insforgeAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzIzNDJ9.u_jgrj8PWviT8JO-6l4V8QIz-ewZZ7vy0jAD3j-gNXQ';

const insforge = createClient(insforgeUrl, insforgeAnonKey);

async function test() {
  console.log('Testing Supabase.co URL...');
  const { data, error } = await insforge.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password'
  });
  
  if (error) {
    console.error('Auth Error:', error.message);
  } else {
    console.log('Auth Success:', data);
  }
}

test();
