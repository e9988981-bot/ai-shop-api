import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { apiGet, apiPost } from '@/lib/api';

const nav = [
  { href: '/', label: 'Dashboard' },
  { href: '/shop', label: 'Shop' },
  { href: '/products', label: 'Products' },
  { href: '/orders', label: 'Orders' },
  { href: '/categories', label: 'Categories' },
  { href: '/wa-numbers', label: 'WhatsApp' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ email: string }>('/api/auth/me').then((res) => {
      if (res.ok && res.data) setUser(res.data);
      else navigate('/login', { replace: true });
      setLoading(false);
    });
  }, [navigate]);

  const handleLogout = async () => {
    await apiPost('/api/auth/logout', {});
    setUser(null);
    navigate('/login', { replace: true });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-gray-900 text-white p-4 flex flex-col">
        <span className="font-bold mb-6">Admin</span>
        <nav className="flex-1 space-y-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              to={n.href}
              className={`block px-3 py-2 rounded ${location.pathname === n.href || (n.href !== '/' && location.pathname.startsWith(n.href)) ? 'bg-blue-600' : 'hover:bg-gray-800'}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-700 pt-4">
          <p className="text-sm text-gray-400 truncate">{user.email}</p>
          <button type="button" onClick={handleLogout} className="mt-2 text-sm text-red-400 hover:text-red-300">
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
