import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { insforge } from '../services/insforge';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // 1. Sign in with Insforge Auth
      const { data: authData, error: authError } = await insforge.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Login failed');

      // 2. Fetch profile
      const { data: userProfile, error: profileError } = await insforge.database
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // 3. Store user and navigate
      localStorage.setItem('aura_user', JSON.stringify(userProfile || { id: authData.user.id, email }));
      navigate('/dashboard');
    } catch (error: any) {
      const message = error.message || 'Unknown error';
      alert(`Login Failed: ${message}\n\nTip: Ensure VITE_INSFORGE_URL and VITE_INSFORGE_ANON_KEY are set correctly.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 sm:space-y-8 bg-zinc-900 p-6 sm:p-8 rounded-2xl border border-zinc-800 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-zinc-800/50 rounded-2xl mb-4">
            <img
              src="https://res.cloudinary.com/dudwzh2xy/image/upload/v1774161751/nexera_logo_rk3yzf.png"
              alt="Nexera Note"
              className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100">Welcome Back</h1>
          <p className="text-zinc-500 text-sm">Log in to Nexera Note</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-zinc-100 outline-none focus:border-orange-500/50 transition-colors"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-zinc-100 outline-none focus:border-orange-500/50 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-zinc-100 text-zinc-950 font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {isLoading ? 'Connecting...' : 'Log In'}
            {!isLoading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="text-center space-y-4">
          <p className="text-zinc-500 text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-orange-500 hover:underline">
              Sign up
            </Link>
          </p>
          <div className="text-xs text-zinc-600">
            By continuing, you agree to Nexera Note's Terms of Service.
          </div>
        </div>
      </div>
    </div>
  );
}
