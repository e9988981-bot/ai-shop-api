'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState<{ products: number; orders: number } | null>(null);
  useEffect(() => {
    Promise.all([
      apiGet<{ total: number }>('/api/admin/products?limit=1'),
      apiGet<{ total: number }>('/api/admin/orders?limit=1'),
    ]).then(([pRes, oRes]) => {
      const p = pRes.ok && pRes.data && typeof pRes.data === 'object' && 'total' in pRes.data
        ? (pRes.data as { total: number }).total
        : 0;
      const o = oRes.ok && oRes.data && typeof oRes.data === 'object' && 'total' in oRes.data
        ? (oRes.data as { total: number }).total
        : 0;
      setStats({ products: p, orders: o });
    });
  }, []);
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4">
        <Link href="/admin/products" className="p-6 bg-white rounded-xl shadow">
          <h2 className="text-lg font-semibold">Products</h2>
          <p className="text-3xl font-bold text-blue-600">{stats?.products ?? '-'}</p>
        </Link>
        <Link href="/admin/orders" className="p-6 bg-white rounded-xl shadow">
          <h2 className="text-lg font-semibold">Orders</h2>
          <p className="text-3xl font-bold text-blue-600">{stats?.orders ?? '-'}</p>
        </Link>
      </div>
    </div>
  );
}
