import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { apiGet, apiPost } from '@/lib/api';

const nav = [
  { href: '/', label: 'แดชบอร์ด' },
  { href: '/shop', label: 'ตั้งค่าข้อมูลร้าน' },
  { href: '/products', label: 'สินค้า' },
  { href: '/orders', label: 'ออเดอร์' },
  { href: '/categories', label: 'หมวดหมู่' },
  { href: '/wa-numbers', label: 'เบอร์ WhatsApp' },
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <span className="text-slate-500">กำลังโหลด...</span>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className="w-56 bg-slate-800 text-white p-4 flex flex-col shrink-0">
        <span className="font-bold text-lg mb-6">หลังบ้าน</span>
        <nav className="flex-1 space-y-0.5">
          {nav.map((n) => (
            <Link
              key={n.href}
              to={n.href}
              className={`block px-3 py-2.5 rounded-lg text-sm ${
                location.pathname === n.href || (n.href !== '/' && location.pathname.startsWith(n.href))
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-700 pt-4 mt-4">
          <p className="text-sm text-slate-400 truncate" title={user.email}>
            {user.email}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 text-sm text-red-300 hover:text-red-200"
          >
            ออกจากระบบ
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
