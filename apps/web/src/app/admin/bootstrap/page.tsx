'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';

export default function BootstrapPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    domain: typeof window !== 'undefined' ? window.location.hostname : '',
    shop_name_lo: '',
    shop_name_en: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await apiPost<{ shopId: number }>('/api/admin/bootstrap', form);
    setLoading(false);
    if (res.ok) {
      router.replace('/admin/login');
    } else {
      setError(res.error || 'Bootstrap failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white rounded-xl shadow">
        <h1 className="text-xl font-bold mb-4">Create First Shop</h1>
        <p className="text-sm text-gray-600 mb-4">
          No users exist yet. Create your first shop and owner account.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Domain (e.g. myshop.com)</label>
            <input
              type="text"
              required
              value={form.domain}
              onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
              placeholder="myshop.com"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Shop Name (Lao)</label>
              <input
                type="text"
                required
                value={form.shop_name_lo}
                onChange={(e) => setForm((f) => ({ ...f, shop_name_lo: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Shop Name (English)</label>
              <input
                type="text"
                required
                value={form.shop_name_en}
                onChange={(e) => setForm((f) => ({ ...f, shop_name_en: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Owner Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password (min 8 chars)</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Shop'}
          </button>
        </form>
      </div>
    </div>
  );
}
