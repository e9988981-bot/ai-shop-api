import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { apiGet, apiPost } from '@/lib/api';

const nav = [
  { href: '/', label: 'แดชบอร์ด', exact: true },
  { href: '/shop', label: 'ตั้งค่าข้อมูลร้าน', exact: true },
  { href: '/products', label: 'สินค้า', exact: false },
  { href: '/orders', label: 'ออเดอร์', exact: true },
  { href: '/categories', label: 'หมวดหมู่', exact: true },
  { href: '/wa-numbers', label: 'เบอร์ WhatsApp', exact: true },
];

function isActive(path: string, href: string, exact: boolean) {
  if (exact) return path === href;
  return path === href || path.startsWith(href + '/');
}

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
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-60 bg-slate-800 text-white flex flex-col shrink-0 shadow-lg">
        <div className="p-5 border-b border-slate-700">
          <span className="font-bold text-lg tracking-tight">หลังบ้าน</span>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map((n) => {
            const active = isActive(location.pathname, n.href, n.exact ?? false);
            return (
              <Link
                key={n.href}
                to={n.href}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-700 p-4">
          <p className="text-sm text-slate-400 truncate" title={user.email}>
            {user.email}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 text-sm text-slate-400 hover:text-red-300 transition"
          >
            ออกจากระบบ
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
