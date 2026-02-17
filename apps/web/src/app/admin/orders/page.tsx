'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '@/lib/api';

interface OrderItem {
  id: number;
  customer_name: string;
  customer_phone: string;
  product_name_en?: string;
  product_name_lo?: string;
  qty: number;
  status: string;
  created_at: string;
}

export default function AdminOrdersPage() {
  const [data, setData] = useState<{ items: OrderItem[]; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    apiGet<{ items: OrderItem[]; total: number }>(`/api/admin/orders?${params}`).then((res) => {
      if (res.ok && res.data) setData(res.data);
    });
  }, [page, status, search]);

  const updateStatus = async (orderId: number, newStatus: string) => {
    await apiPut(`/api/admin/orders?id=${orderId}`, { status: newStatus });
    setData((d) => {
      if (!d) return d;
      return {
        ...d,
        items: d.items.map((o) =>
          o.id === orderId ? { ...o, status: newStatus } : o
        ),
      };
    });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders</h1>
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Search phone/name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="">All status</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="done">Done</option>
          <option value="canceled">Canceled</option>
        </select>
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/admin/orders/export.csv`}
          download="orders.csv"
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Export CSV
        </a>
      </div>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Customer</th>
              <th className="px-4 py-2 text-left">Phone</th>
              <th className="px-4 py-2 text-left">Product</th>
              <th className="px-4 py-2 text-left">Qty</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map((o) => (
              <tr key={o.id} className="border-t">
                <td className="px-4 py-2">{o.id}</td>
                <td className="px-4 py-2">{o.customer_name}</td>
                <td className="px-4 py-2">{o.customer_phone}</td>
                <td className="px-4 py-2">{o.product_name_en || o.product_name_lo || ''}</td>
                <td className="px-4 py-2">{o.qty}</td>
                <td className="px-4 py-2">
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                    className="text-sm border rounded"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="done">Done</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </td>
                <td className="px-4 py-2">{o.created_at}</td>
                <td className="px-4 py-2">-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && data.total > 20 && (
        <div className="mt-4 flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <button
            disabled={page * 20 >= data.total}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
