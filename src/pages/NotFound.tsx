import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <h1 className="text-8xl font-bold text-zinc-800">404</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-12 h-1 bg-orange-500 rounded"></div>
            <div className="w-12 h-1 bg-orange-500/50 rounded"></div>
            <div className="w-12 h-1 bg-orange-500/25 rounded"></div>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-zinc-100 mb-4">
          Page Not Found
        </h2>
        
        <p className="text-zinc-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="flex flex-col gap-3">
          <Link
            to="/"
            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
          >
            Go to Home
          </Link>
          
          <Link
            to="/login"
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium rounded-lg transition-colors"
          >
            Go to Login
          </Link>
        </div>
        
        <p className="text-zinc-600 text-sm mt-8">
          If you think this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}
