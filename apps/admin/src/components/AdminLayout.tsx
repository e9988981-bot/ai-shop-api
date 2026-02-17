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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 w-60 bg-slate-800 text-white flex flex-col shrink-0 shadow-lg z-40 transform transition-transform duration-200 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-5 border-b border-slate-700 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight">หลังบ้าน</span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map((n) => {
            const active = isActive(location.pathname, n.href, n.exact ?? false);
            return (
              <Link
                key={n.href}
                to={n.href}
                onClick={() => setSidebarOpen(false)}
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

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto w-full md:w-auto">
        <Outlet />
      </main>
    </div>
  );
}
