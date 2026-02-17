'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';

function imgUrl(key: string | null): string {
  if (!key) return '';
  return `/api/public/images/${encodeURIComponent(key)}`;
}

export default function AdminProductsPage() {
  const [data, setData] = useState<{ items: Record<string, unknown>[]; total: number } | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiGet<{ items: Record<string, unknown>[]; total: number }>(`/api/admin/products?page=${page}&limit=20`).then(
      (res) => {
        if (res.ok && res.data) setData(res.data);
      }
    );
  }, [page]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Add Product
        </Link>
      </div>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Image</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Price</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map((p) => (
              <tr key={String(p.id)} className="border-t">
                <td className="px-4 py-2">
                  {p.cover_image ? (
                    <img src={imgUrl(p.cover_image as string)} alt="" className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded" />
                  )}
                </td>
                <td className="px-4 py-2">{String(p.name_en || p.name_lo)}</td>
                <td className="px-4 py-2">৳{p.price}</td>
                <td className="px-4 py-2">{String(p.status)}</td>
                <td className="px-4 py-2">
                  <Link href={`/admin/products/${p.id}`} className="text-blue-600 hover:underline">
                    Edit
                  </Link>
                </td>
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
