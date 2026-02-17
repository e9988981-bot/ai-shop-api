import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiGet, apiPost } from '@/lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    apiGet<{ email: string }>('/api/auth/me').then((res) => {
      if (res.ok && res.data) navigate('/', { replace: true });
      setChecking(false);
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await apiPost<{ userId: number }>('/api/auth/login', { email, password });
    setLoading(false);
    if (res.ok) {
      navigate('/', { replace: true });
    } else {
      setError(res.error || 'Login failed');
    }
  };

  if (checking) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-sm p-6 bg-white rounded-xl shadow">
        <h1 className="text-xl font-bold mb-4">Admin Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '...' : 'Login'}
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-500 text-center">
          No account? <Link to="/bootstrap" className="text-blue-600">Create first shop</Link>
        </p>
      </div>
    </div>
  );
}
