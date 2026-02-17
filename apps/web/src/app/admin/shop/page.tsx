'use client';

import { useEffect, useState, useRef } from 'react';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { compressImage } from '@/lib/image';

function imgUrl(key: string | null): string {
  if (!key) return '';
  return `/api/public/images/${encodeURIComponent(key)}`;
}

export default function AdminShopPage() {
  const [shop, setShop] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name_lo: '',
    name_en: '',
    desc_lo: '',
    desc_en: '',
    theme_primary: '#2563eb',
    theme_secondary: '#1e40af',
    wa_template: '',
  });
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiGet<Record<string, unknown>>('/api/admin/shop').then((res) => {
      if (res.ok && res.data) {
        setShop(res.data);
        setForm({
          name_lo: String(res.data.name_lo ?? ''),
          name_en: String(res.data.name_en ?? ''),
          desc_lo: String(res.data.desc_lo ?? ''),
          desc_en: String(res.data.desc_en ?? ''),
          theme_primary: String(res.data.theme_primary ?? '#2563eb'),
          theme_secondary: String(res.data.theme_secondary ?? '#1e40af'),
          wa_template: String(res.data.wa_template ?? ''),
        });
      }
      setLoading(false);
    });
  }, []);

  const uploadFile = async (file: File, field: 'avatar_key' | 'cover_key') => {
    const blob = await compressImage(file);
    const signRes = await apiPost<{ uploadUrl: string; r2Key: string }>('/api/admin/uploads/sign', {
      ext: file.name.split('.').pop() || 'jpg',
    });
    if (!signRes.ok || !signRes.data) return;
    const { uploadUrl, r2Key } = signRes.data;
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      credentials: 'include',
      headers: { 'Content-Type': blob.type || 'image/jpeg' },
    });
    if (!putRes.ok) return;
    await apiPut('/api/admin/shop', { [field]: r2Key });
    setShop((s) => (s ? { ...s, [field]: r2Key } : null));
  };

  const handleSave = async () => {
    setSaving(true);
    await apiPut('/api/admin/shop', form);
    setSaving(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Shop Settings</h1>
      <div className="space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm font-medium mb-1">Avatar</label>
          <div className="flex items-center gap-4">
            {shop?.avatar_key ? (
              <img src={imgUrl(shop.avatar_key as string)} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : null}
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f, 'avatar_key');
              }}
            />
            <button
              onClick={() => avatarRef.current?.click()}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Upload
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Cover</label>
          <div className="flex items-center gap-4">
            {shop?.cover_key ? (
              <img src={imgUrl(shop.cover_key as string)} alt="" className="w-32 h-16 object-cover rounded" />
            ) : null}
            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f, 'cover_key');
              }}
            />
            <button
              onClick={() => coverRef.current?.click()}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Upload
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name (Lao)</label>
            <input
              value={form.name_lo}
              onChange={(e) => setForm((f) => ({ ...f, name_lo: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name (English)</label>
            <input
              value={form.name_en}
              onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Description (Lao)</label>
            <textarea
              value={form.desc_lo}
              onChange={(e) => setForm((f) => ({ ...f, desc_lo: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (English)</label>
            <textarea
              value={form.desc_en}
              onChange={(e) => setForm((f) => ({ ...f, desc_en: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Theme Primary</label>
            <input
              type="color"
              value={form.theme_primary}
              onChange={(e) => setForm((f) => ({ ...f, theme_primary: e.target.value }))}
              className="w-full h-10 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Theme Secondary</label>
            <input
              type="color"
              value={form.theme_secondary}
              onChange={(e) => setForm((f) => ({ ...f, theme_secondary: e.target.value }))}
              className="w-full h-10 rounded"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">WhatsApp Template (use {'{{product_name}}'}, {'{{qty}}'}, etc.)</label>
          <textarea
            value={form.wa_template}
            onChange={(e) => setForm((f) => ({ ...f, wa_template: e.target.value }))}
            rows={6}
            placeholder="Hi! I would like to order..."
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
