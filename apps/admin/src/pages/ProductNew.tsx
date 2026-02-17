import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '@/lib/api';

interface Category {
  id: number;
  name_lo: string;
  name_en: string;
}

export default function ProductNew() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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
    apiGet<Category[]>('/api/admin/categories').then((res) => {
      if (res.ok && Array.isArray(res.data)) setCategories(res.data);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.slug.trim() || !form.name_lo.trim() || !form.name_en.trim()) {
      setError('กรุณากรอก Slug, ชื่อ (ลาว) และชื่อ (English)');
      return;
    }
    const slug = form.slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!slug) {
      setError('Slug ต้องเป็นตัวอักษรภาษาอังกฤษเล็ก ตัวเลข และขีดเท่านั้น (เช่น my-product)');
      return;
    }
    setSaving(true);
    const res = await apiPost<{ id: number }>('/api/admin/products', {
      ...form,
      slug,
      price: Number(form.price) || 0,
      desc_lo: form.desc_lo || null,
      desc_en: form.desc_en || null,
    });
    setSaving(false);
    if (res.ok && res.data?.id) {
      navigate(`/products/${res.data.id}`, { replace: true });
    } else {
      setError(res.error || 'ไม่สามารถสร้างสินค้าได้');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-slate-500">กำลังโหลด...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link to="/products" className="text-slate-500 hover:text-slate-700 flex items-center gap-1">
          <span>←</span> สินค้า
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">เพิ่มสินค้าใหม่</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="card-admin">
          <h2 className="font-semibold text-slate-800 mb-4">ข้อมูลสินค้า</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Slug (ภาษาอังกฤษ, ใช้ใน URL)</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="input-admin"
                placeholder="เช่น my-product"
                required
              />
              <p className="text-xs text-slate-500 mt-1">ใช้ตัวอักษรเล็ก a-z, ตัวเลข และขีด (-) เท่านั้น</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ (ลาว)</label>
                <input
                  type="text"
                  value={form.name_lo}
                  onChange={(e) => setForm((f) => ({ ...f, name_lo: e.target.value }))}
                  className="input-admin"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ (English)</label>
                <input
                  type="text"
                  value={form.name_en}
                  onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
                  className="input-admin"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">หมวดหมู่</label>
              <select
                value={form.category_id ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value ? Number(e.target.value) : null }))}
                className="input-admin"
              >
                <option value="">— ไม่มี —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_lo} / {c.name_en}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ราคา</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price || ''}
                  onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))}
                  className="input-admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">สถานะ</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'draft' | 'published' }))}
                  className="input-admin"
                >
                  <option value="draft">แบบร่าง</option>
                  <option value="published">เผยแพร่</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">คำอธิบาย (ลาว) — ไม่บังคับ</label>
              <textarea
                value={form.desc_lo}
                onChange={(e) => setForm((f) => ({ ...f, desc_lo: e.target.value }))}
                className="input-admin"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">คำอธิบาย (English) — ไม่บังคับ</label>
              <textarea
                value={form.desc_en}
                onChange={(e) => setForm((f) => ({ ...f, desc_en: e.target.value }))}
                className="input-admin"
                rows={2}
              />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'กำลังสร้าง...' : 'สร้างสินค้า'}
            </button>
            <Link to="/products" className="btn-secondary">
              ยกเลิก
            </Link>
          </div>
        </div>
      </form>
      <p className="text-slate-500 text-sm mt-2">หลังสร้างแล้ว จะเข้าสู่หน้าแก้ไขเพื่ออัปโหลดรูปสินค้าได้</p>
    </div>
  );
}
