import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

interface Category {
  id: number;
  name_lo: string;
  name_en: string;
  sort_order: number;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ name_lo: '', name_en: '', sort_order: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = () => {
    apiGet<Category[]>('/api/admin/categories').then((res) => {
      if (res.ok && Array.isArray(res.data)) {
        setCategories(res.data.sort((a, b) => a.sort_order - b.sort_order));
      }
      setLoading(false);
    });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name_lo.trim() || !form.name_en.trim()) {
      setError('กรุณากรอกชื่อหมวดหมู่ทั้งสองภาษา');
      return;
    }
    const res = await apiPost<Category>('/api/admin/categories', {
      name_lo: form.name_lo.trim(),
      name_en: form.name_en.trim(),
      sort_order: form.sort_order || 0,
    });
    if (res.ok && res.data) {
      setForm({ name_lo: '', name_en: '', sort_order: 0 });
      load();
    } else {
      setError(res.error || 'ไม่สามารถสร้างหมวดหมู่ได้');
    }
  };

  const handleEdit = async (id: number) => {
    setError('');
    if (!form.name_lo.trim() || !form.name_en.trim()) {
      setError('กรุณากรอกชื่อหมวดหมู่ทั้งสองภาษา');
      return;
    }
    const res = await apiPut(`/api/admin/categories/${id}`, {
      name_lo: form.name_lo.trim(),
      name_en: form.name_en.trim(),
      sort_order: form.sort_order || 0,
    });
    if (res.ok) {
      setEditing(null);
      setForm({ name_lo: '', name_en: '', sort_order: 0 });
      load();
    } else {
      setError(res.error || 'ไม่สามารถแก้ไขหมวดหมู่ได้');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('ลบหมวดหมู่นี้? สินค้าที่อยู่ในหมวดหมู่นี้จะไม่ถูกลบ แต่จะไม่มีหมวดหมู่')) return;
    const res = await apiDelete(`/api/admin/categories/${id}`);
    if (res.ok) load();
  };

  const startEdit = (cat: Category) => {
    setEditing(cat.id);
    setForm({ name_lo: cat.name_lo, name_en: cat.name_en, sort_order: cat.sort_order });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({ name_lo: '', name_en: '', sort_order: 0 });
    setError('');
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
      <h1 className="text-2xl font-bold text-slate-800 mb-2">หมวดหมู่สินค้า</h1>
      <p className="text-slate-500 mb-6">จัดกลุ่มสินค้าเพื่อให้ลูกค้าค้นหาง่ายขึ้น (ไม่บังคับ)</p>

      <div className="max-w-2xl space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* เพิ่มหมวดหมู่ */}
        <div className="card-admin">
          <h2 className="font-semibold text-slate-800 mb-4">
            {editing ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
          </h2>
          <form onSubmit={editing ? (e) => { e.preventDefault(); handleEdit(editing); } : handleAdd} className="space-y-4">
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
              <label className="block text-sm font-medium text-slate-700 mb-1">ลำดับ (น้อย = แสดงก่อน)</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))}
                className="input-admin w-32"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary">
                {editing ? 'บันทึกการแก้ไข' : 'เพิ่มหมวดหมู่'}
              </button>
              {editing && (
                <button type="button" onClick={cancelEdit} className="btn-secondary">
                  ยกเลิก
                </button>
              )}
            </div>
          </form>
        </div>

        {/* รายการหมวดหมู่ */}
        <div className="card-admin">
          <h2 className="font-semibold text-slate-800 mb-4">รายการหมวดหมู่</h2>
          {categories.length === 0 ? (
            <p className="text-slate-500 text-sm">ยังไม่มีหมวดหมู่ — เพิ่มด้านบน</p>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between py-3 px-4 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <div>
                    <span className="font-medium text-slate-800">{cat.name_lo}</span>
                    <span className="text-slate-500 mx-2">/</span>
                    <span className="text-slate-600">{cat.name_en}</span>
                    {cat.sort_order !== 0 && (
                      <span className="text-xs text-slate-400 ml-2">(ลำดับ: {cat.sort_order})</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      className="text-sm px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id)}
                      className="text-sm px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
