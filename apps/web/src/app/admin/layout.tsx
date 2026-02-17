'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { LocaleToggle } from '@/components/LocaleToggle';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ email: string }>('/api/auth/me').then((res) => {
      if (res.ok && res.data) setUser(res.data);
      else if (!pathname?.includes('/login') && !pathname?.includes('/bootstrap')) router.replace('/admin/login');
      setLoading(false);
    });
  }, [pathname, router]);

  const handleLogout = async () => {
    await apiPost('/api/auth/logout', {});
    setUser(null);
    router.replace('/admin/login');
  };

  if (pathname?.includes('/login') || pathname?.includes('/bootstrap')) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">Loading...</div>
    );
  }
  if (!user) return null;

  const nav = [
    { href: '/admin/', label: 'Dashboard' },
    { href: '/admin/shop', label: 'Shop' },
    { href: '/admin/products', label: 'Products' },
    { href: '/admin/orders', label: 'Orders' },
    { href: '/admin/categories', label: 'Categories' },
    { href: '/admin/wa-numbers', label: 'WhatsApp' },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-gray-900 text-white p-4 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <span className="font-bold">Admin</span>
          <LocaleToggle />
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`block px-3 py-2 rounded ${
                pathname === n.href ? 'bg-blue-600' : 'hover:bg-gray-800'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-700 pt-4">
          <p className="text-sm text-gray-400 truncate">{user.email}</p>
          <button
            onClick={handleLogout}
            className="mt-2 text-sm text-red-400 hover:text-red-300"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
