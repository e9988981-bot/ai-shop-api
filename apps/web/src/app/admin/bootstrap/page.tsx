'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';

function getDefaultDomain(): string {
  if (typeof window === 'undefined') return '';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  if (apiUrl) {
    try {
      return new URL(apiUrl).hostname;
    } catch {
      return window.location.hostname;
    }
  }
  return window.location.hostname;
}

/** Send hostname only (API looks up shop by Host header). */
function toHostname(value: string): string {
  const s = value.trim().replace(/\/+$/, '');
  if (!s) return s;
  try {
    const url = s.startsWith('http://') || s.startsWith('https://') ? new URL(s) : new URL('https://' + s);
    return url.hostname;
  } catch {
    return s.toLowerCase();
  }
}

export default function BootstrapPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    domain: '',
    shop_name_lo: '',
    shop_name_en: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!form.domain) setForm((f) => ({ ...f, domain: getDefaultDomain() }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const payload = { ...form, domain: toHostname(form.domain) || form.domain };
    const res = await apiPost<{ shopId: number }>('/api/admin/bootstrap', payload);
    setLoading(false);
    if (res.ok) {
      router.replace('/admin/login');
    } else {
      const status = res.status;
      const msg = res.error || 'Bootstrap failed';
      if (status === 404 || status === 405) {
        setError(
          'ไม่พบ API (404/405). ถ้าเว็บอยู่ Cloudflare Pages แยกจาก Worker ให้ตั้งค่า Environment variable ใน Cloudflare Pages: ชื่อ NEXT_PUBLIC_API_URL ค่าเป็น URL ของ Worker (เช่น https://ai-shop-api.xxx.workers.dev) แล้ว Redeploy'
        );
      } else {
        setError(msg);
      }
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
            <label htmlFor="bootstrap-domain" className="block text-sm font-medium mb-1">Domain</label>
            <input
              id="bootstrap-domain"
              name="domain"
              type="text"
              required
              value={form.domain}
              onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
              placeholder="e.g. ai-shop-api.xxx.workers.dev or yourdomain.com"
              className="w-full px-3 py-2 border rounded-lg"
              autoComplete="url"
            />
            <p className="text-xs text-gray-500 mt-1">
              ใช้โดเมนที่เรียก API (ถ้าเว็บอยู่ Pages แยกจาก Worker ให้ใส่โดเมนของ Worker เช่น xxx.workers.dev)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="bootstrap-shop_name_lo" className="block text-sm font-medium mb-1">Shop Name (Lao)</label>
              <input
                id="bootstrap-shop_name_lo"
                name="shop_name_lo"
                type="text"
                required
                value={form.shop_name_lo}
                onChange={(e) => setForm((f) => ({ ...f, shop_name_lo: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                autoComplete="organization"
              />
            </div>
            <div>
              <label htmlFor="bootstrap-shop_name_en" className="block text-sm font-medium mb-1">Shop Name (English)</label>
              <input
                id="bootstrap-shop_name_en"
                name="shop_name_en"
                type="text"
                required
                value={form.shop_name_en}
                onChange={(e) => setForm((f) => ({ ...f, shop_name_en: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                autoComplete="organization"
              />
            </div>
          </div>
          <div>
            <label htmlFor="bootstrap-email" className="block text-sm font-medium mb-1">Owner Email</label>
            <input
              id="bootstrap-email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="bootstrap-password" className="block text-sm font-medium mb-1">Password (min 8 chars)</label>
            <input
              id="bootstrap-password"
              name="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              autoComplete="new-password"
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
