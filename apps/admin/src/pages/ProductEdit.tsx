import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet, apiPut, apiPost, apiDelete } from '@/lib/api';

function imgUrl(key: string | null): string {
  if (!key) return '';
  return `/api/public/images/${encodeURIComponent(key)}`;
}

interface Category {
  id: number;
  name_lo: string;
  name_en: string;
}

interface ProductImage {
  id: number;
  r2_key: string;
  sort_order: number;
}

interface Product {
  id: number;
  slug: string;
  name_lo: string;
  name_en: string;
  desc_lo: string | null;
  desc_en: string | null;
  price: number;
  status: string;
  category_id: number | null;
  cover_image_id: number | null;
  images?: ProductImage[];
}

export default function ProductEdit() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    slug: '',
    name_lo: '',
    name_en: '',
    desc_lo: '',
    desc_en: '',
    price: 0,
    status: 'draft' as 'draft' | 'published',
    category_id: null as number | null,
  });

  useEffect(() => {
    if (!id) return;
    const pid = Number(id);
    if (Number.isNaN(pid)) {
      setLoading(false);
      return;
    }
    Promise.all([
      apiGet<Product>(`/api/admin/products/${id}`),
      apiGet<Category[]>('/api/admin/categories'),
    ]).then(([prodRes, catRes]) => {
      if (prodRes.ok && prodRes.data) {
        setProduct(prodRes.data);
        setForm({
          slug: prodRes.data.slug,
          name_lo: prodRes.data.name_lo ?? '',
          name_en: prodRes.data.name_en ?? '',
          desc_lo: prodRes.data.desc_lo ?? '',
          desc_en: prodRes.data.desc_en ?? '',
          price: prodRes.data.price ?? 0,
          status: (prodRes.data.status as 'draft' | 'published') || 'draft',
          category_id: prodRes.data.category_id ?? null,
        });
      }
      if (catRes.ok && Array.isArray(catRes.data)) setCategories(catRes.data);
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    if (!id || !product) return;
    setError('');
    setSuccess('');
    setSaving(true);
    const res = await apiPut(`/api/admin/products/${id}`, form);
    setSaving(false);
    if (res.ok && res.data) {
      setProduct(res.data as Product);
      setSuccess('บันทึกข้อมูลสำเร็จ');
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(res.error || 'ไม่สามารถบันทึกข้อมูลได้');
    }
  };

  const uploadImage = async (file: File) => {
    if (!id) return;
    setUploading(true);
    const signRes = await apiPost<{ uploadUrl: string; r2Key: string }>('/api/admin/uploads/sign', {
      ext: file.name.split('.').pop() || 'jpg',
    });
    if (!signRes.ok || !signRes.data) {
      setUploading(false);
      return;
    }
    const { uploadUrl, r2Key } = signRes.data;
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      credentials: 'include',
      headers: { 'Content-Type': file.type || 'image/jpeg' },
    });
    if (!putRes.ok) {
      setUploading(false);
      return;
    }
    const addRes = await apiPost<ProductImage>(`/api/admin/products/${id}/images`, { r2_key: r2Key });
    if (addRes.ok && addRes.data && product) {
      const images = [...(product.images || []), addRes.data];
      // ถ้ายังไม่มี cover_image_id ให้ set รูปแรกเป็น cover อัตโนมัติ
      const newCoverImageId = product.cover_image_id || addRes.data.id;
      setProduct({ ...product, images, cover_image_id: newCoverImageId });
      // อัปเดต cover_image_id ในฐานข้อมูลถ้ายังไม่มี
      if (!product.cover_image_id) {
        await apiPut(`/api/admin/products/${id}`, { cover_image_id: addRes.data.id });
      }
    }
    setUploading(false);
  };

  const setCover = async (imageId: number) => {
    if (!id || !product) return;
    const res = await apiPut(`/api/admin/products/${id}`, { cover_image_id: imageId });
    if (res.ok && res.data) setProduct(res.data as Product);
  };

  const deleteImage = async (imageId: number) => {
    if (!product) return;
    const res = await apiDelete(`/api/admin/product-images/${imageId}`);
    if (res.ok) {
      setProduct({
        ...product,
        images: (product.images || []).filter((img) => img.id !== imageId),
        cover_image_id: product.cover_image_id === imageId ? null : product.cover_image_id,
      });
    }
  };

  const moveImage = async (index: number, delta: number) => {
    const imgs = product?.images || [];
    const newOrder = [...imgs];
    const j = index + delta;
    if (j < 0 || j >= newOrder.length) return;
    [newOrder[index], newOrder[j]] = [newOrder[j], newOrder[index]];
    const image_ids = newOrder.map((i) => i.id);
    const res = await apiPut(`/api/admin/products/${id}/images/reorder`, { image_ids });
    if (res.ok && Array.isArray(res.data)) setProduct((p) => (p ? { ...p, images: res.data as ProductImage[] } : null));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-slate-500">ກຳລັງໂຫຼດ...</span>
      </div>
    );
  }
  if (!product) {
    return (
      <div>
        <p className="text-slate-500">ບໍ່ພົບສິນຄ້າ</p>
        <Link to="/products" className="text-blue-600 hover:underline mt-2 inline-block">← ກັບລາຍການສິນຄ້າ</Link>
      </div>
    );
  }

  const images = product.images || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4 sm:mb-6">
        <Link to="/products" className="text-slate-500 hover:text-slate-700 text-sm sm:text-base">← ສິນຄ້າ</Link>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">ແກ້ໄຂສິນຄ້າ</h1>
      </div>

      <div className="max-w-2xl space-y-4 sm:space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
            {success}
          </div>
        )}
        {/* ข้อมูลพื้นฐาน */}
        <div className="card-admin">
          <h2 className="font-semibold text-slate-800 mb-4">ຂໍ້ມູນສິນຄ້າ</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Slug (ພາສາອັງກິດ)</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="input-admin"
                placeholder="product-name"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">ຊື່ (ລາວ)</label>
                <input
                  type="text"
                  value={form.name_lo}
                  onChange={(e) => setForm((f) => ({ ...f, name_lo: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">ชื่อ (English)</label>
                <input
                  type="text"
                  value={form.name_en}
                  onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">ຫມວດຫມູ່</label>
              <select
                value={form.category_id ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value ? Number(e.target.value) : null }))}
                className="input-admin"
              >
                <option value="">— ບໍ່ມີ —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_lo} / {c.name_en}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ລາຄາ</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))}
                className="input-admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ສະຖານະ</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'draft' | 'published' }))}
                className="input-admin"
              >
                <option value="draft">ຮ່າງ</option>
                <option value="published">ເຜີຍແຜ່</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ຄຳອະທິບາຍ (ລາວ)</label>
              <textarea
                value={form.desc_lo}
                onChange={(e) => setForm((f) => ({ ...f, desc_lo: e.target.value }))}
                className="input-admin"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">คำอธิบาย (English)</label>
              <textarea
                value={form.desc_en}
                onChange={(e) => setForm((f) => ({ ...f, desc_en: e.target.value }))}
                className="input-admin"
                rows={2}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-4 btn-primary"
          >
            {saving ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກຂໍ້ມູນ'}
          </button>
        </div>

        {/* รูปสินค้า */}
        <div className="card-admin">
          <h2 className="font-semibold text-slate-800 mb-4">ຮູບສິນຄ້າ</h2>
          <p className="text-sm text-slate-500 mb-3">ຮູບທຳອິດທີ່ສະແດງບນຫນ້າຮ້ານຈະໃຊ້ເປັນຮູບປົກ (cover) — ກົດ «ຕັ້ງເປັນຮູບປົກ» ໄດ້</p>
          <div className="flex flex-wrap gap-3">
            {images.map((img, idx) => (
              <div key={img.id} className="relative group border border-slate-200 rounded-lg overflow-hidden w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
                <img src={imgUrl(img.r2_key)} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity">
                  {product.cover_image_id !== img.id && (
                    <button
                      type="button"
                      onClick={() => setCover(img.id)}
                      className="text-xs px-2 py-1 bg-white text-slate-800 rounded"
                    >
                      ຕັ້ງເປັນຮູບປົກ
                    </button>
                  )}
                  {product.cover_image_id === img.id && (
                    <span className="text-xs text-green-300">ຮູບປົກ</span>
                  )}
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveImage(idx, -1)}
                      disabled={idx === 0}
                      className="text-xs px-2 py-1 bg-white text-slate-800 rounded disabled:opacity-50"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(idx, 1)}
                      disabled={idx === images.length - 1}
                      className="text-xs px-2 py-1 bg-white text-slate-800 rounded disabled:opacity-50"
                    >
                      →
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteImage(img.id)}
                    className="text-xs px-2 py-1 bg-red-600 text-white rounded"
                  >
                    ລຶບ
                  </button>
                </div>
              </div>
            ))}
            <div className="w-20 h-20 sm:w-24 sm:h-24 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center flex-shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadImage(f);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-slate-500 hover:text-slate-700 text-xs sm:text-sm disabled:opacity-50 text-center px-2"
              >
                {uploading ? 'ກຳລັງອັບໂຫຼດ...' : '+ ເພີ່ມຮູບ'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
