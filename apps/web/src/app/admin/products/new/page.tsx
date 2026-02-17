'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost, apiGet } from '@/lib/api';

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<{ id: number; name_lo: string; name_en: string }[]>([]);
  const [form, setForm] = useState({
    slug: '',
    name_lo: '',
    name_en: '',
    desc_lo: '',
    desc_en: '',
    price: 0,
    category_id: null as number | null,
    status: 'draft' as 'draft' | 'published',
  });

  useEffect(() => {
    apiGet<{ id: number; name_lo: string; name_en: string }[]>('/api/admin/categories').then((res) => {
      if (res.ok && Array.isArray(res.data)) setCategories(res.data);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiPost<{ id: number }>('/api/admin/products', form);
    if (res.ok && res.data?.id) router.replace(`/admin/products/${res.data.id}`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Product</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <div>
          <label className="block text-sm font-medium mb-1">Slug (a-z, 0-9, -)</label>
          <input
            required
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="my-product"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name (Lao)</label>
            <input
              required
              value={form.name_lo}
              onChange={(e) => setForm((f) => ({ ...f, name_lo: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name (English)</label>
            <input
              required
              value={form.name_en}
              onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description (optional)</label>
          <textarea
            value={form.desc_en}
            onChange={(e) => setForm((f) => ({ ...f, desc_en: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Price</label>
          <input
            type="number"
            min={0}
            step={0.01}
            required
            value={form.price || ''}
            onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={form.category_id ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value ? Number(e.target.value) : null }))}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name_en}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'draft' | 'published' }))}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Create
        </button>
      </form>
    </div>
  );
}
