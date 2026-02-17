'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPut, apiPost, apiDelete } from '@/lib/api';
import { compressImage } from '@/lib/image';

function imgUrl(key: string): string {
  return `/api/public/images/${encodeURIComponent(key)}`;
}

export default function EditProductClient() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({
    slug: '',
    name_lo: '',
    name_en: '',
    desc_lo: '',
    desc_en: '',
    price: 0,
    category_id: null as number | null,
    status: 'draft' as string,
  });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiGet<Record<string, unknown>>(`/api/admin/products/${id}`).then((res) => {
      if (res.ok && res.data) {
        setProduct(res.data);
        setForm({
          slug: String(res.data.slug ?? ''),
          name_lo: String(res.data.name_lo ?? ''),
          name_en: String(res.data.name_en ?? ''),
          desc_lo: String(res.data.desc_lo ?? ''),
          desc_en: String(res.data.desc_en ?? ''),
          price: Number(res.data.price ?? 0),
          category_id: res.data.category_id ? Number(res.data.category_id) : null,
          status: String(res.data.status ?? 'draft'),
        });
      }
    });
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    await apiPut(`/api/admin/products/${id}`, form);
    setSaving(false);
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const blob = await compressImage(file);
    const signRes = await apiPost<{ uploadUrl: string; r2Key: string }>('/api/admin/uploads/sign', {
      ext: file.name.split('.').pop() || 'jpg',
    });
    if (!signRes.ok || !signRes.data) return;
    await fetch(signRes.data.uploadUrl, {
      method: 'PUT',
      body: blob,
      credentials: 'include',
      headers: { 'Content-Type': blob.type || 'image/jpeg' },
    });
    await apiPost(`/api/admin/products/${id}/images`, { r2_key: signRes.data.r2Key });
    const res = await apiGet<Record<string, unknown>>(`/api/admin/products/${id}`);
    if (res.ok && res.data) setProduct(res.data);
  };

  const setCover = async (imgId: number) => {
    await apiPut(`/api/admin/products/${id}`, { cover_image_id: imgId });
    setProduct((p) => (p ? { ...p, cover_image_id: imgId } : null));
  };

  const removeImage = async (imgId: number) => {
    await apiDelete(`/api/admin/product-images/${imgId}`);
    const res = await apiGet<Record<string, unknown>>(`/api/admin/products/${id}`);
    if (res.ok && res.data) setProduct(res.data);
  };

  if (!product) return <div>Loading...</div>;

  const images = (product.images as { id: number; r2_key: string }[]) || [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
      <div className="space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm font-medium mb-1">Images</label>
          <div className="flex flex-wrap gap-2">
            {images.map((img) => (
              <div key={img.id} className="relative">
                <img src={imgUrl(img.r2_key)} alt="" className="w-20 h-20 object-cover rounded" />
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded text-xs"
                >
                  ×
                </button>
                <button
                  onClick={() => setCover(img.id)}
                  className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-0.5"
                >
                  Cover
                </button>
              </div>
            ))}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadImage}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 border-2 border-dashed rounded flex items-center justify-center text-gray-400 hover:border-blue-500"
            >
              +
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Slug</label>
          <input
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg"
          />
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
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
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
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
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
