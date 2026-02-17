import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState<{ products: number; orders: number } | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<{ items: unknown[]; total: number }>('/api/admin/products?page=1&limit=1'),
      apiGet<{ items: unknown[]; total: number }>('/api/admin/orders?page=1&limit=1'),
    ]).then(([pRes, oRes]) => {
      setStats({
        products: (pRes.ok && pRes.data && 'total' in pRes.data && typeof (pRes.data as { total: number }).total === 'number') ? (pRes.data as { total: number }).total : 0,
        orders: (oRes.ok && oRes.data && 'total' in oRes.data && typeof (oRes.data as { total: number }).total === 'number') ? (oRes.data as { total: number }).total : 0,
      });
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      {stats && (
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="p-4 bg-white rounded-lg shadow">
            <p className="text-gray-500">Products</p>
            <p className="text-2xl font-bold">{stats.products}</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <p className="text-gray-500">Orders</p>
            <p className="text-2xl font-bold">{stats.orders}</p>
          </div>
        </div>
      )}
    </div>
  );
}
