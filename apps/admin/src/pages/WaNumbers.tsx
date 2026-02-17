import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

type WaItem = {
  id: number;
  label: string;
  phone_e164: string;
  is_default: boolean;
  is_active: boolean;
};

export default function WaNumbers() {
  const [items, setItems] = useState<WaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ label: '', phone_e164: '', is_default: false });

  const load = () => {
    apiGet<WaItem[]>('/api/admin/wa-numbers').then((res) => {
      if (res.ok && Array.isArray(res.data)) setItems(res.data);
      else if (res.ok && res.data && typeof res.data === 'object' && !Array.isArray(res.data)) setItems([]);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || !form.phone_e164.trim()) return;
    const res = await apiPost('/api/admin/wa-numbers', {
      label: form.label.trim(),
      phone_e164: form.phone_e164.trim().replace(/\s/g, ''),
      is_default: form.is_default,
      is_active: true,
    });
    if (res.ok) {
      setForm({ label: '', phone_e164: '', is_default: false });
      load();
    }
  };

  const setDefault = async (id: number) => {
    await apiPut(`/api/admin/wa-numbers/${id}`, { is_default: true });
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('ลบเบอร์นี้?')) return;
    await apiDelete(`/api/admin/wa-numbers/${id}`);
    load();
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
      <h1 className="text-2xl font-bold text-slate-800 mb-2">เบอร์ WhatsApp</h1>
      <p className="text-slate-500 mb-6">
        เบอร์ที่ใช้รับออเดอร์จากลูกค้า (ลูกค้าสั่งแล้วจะได้ลิงก์แชร์ไปเบอร์ที่เลือก) — อย่างน้อย 1 เบอร์
      </p>

      <div className="max-w-xl space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-3">เพิ่มเบอร์</h2>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-sm text-slate-600 mb-1">ชื่อ (เช่น เบอร์หลัก)</label>
              <input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                className="w-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="เบอร์หลัก"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">เบอร์ (E.164 เช่น +8562012345678)</label>
              <input
                value={form.phone_e164}
                onChange={(e) => setForm((f) => ({ ...f, phone_e164: e.target.value }))}
                className="w-44 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="+8562012345678"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
                className="rounded"
              />
              เป็นค่าเริ่มต้น
            </label>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              เพิ่ม
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-3">รายการเบอร์</h2>
          {items.length === 0 ? (
            <p className="text-slate-500 text-sm">ยังไม่มีเบอร์ — เพิ่มด้านบน</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-slate-600 font-mono text-sm">{item.phone_e164}</span>
                  <div className="flex gap-2">
                    {!item.is_default && (
                      <button
                        type="button"
                        onClick={() => setDefault(item.id)}
                        className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200"
                      >
                        ตั้งเป็นค่าเริ่มต้น
                      </button>
                    )}
                    {item.is_default && (
                      <span className="text-xs text-green-600 font-medium">ค่าเริ่มต้น</span>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      ลบ
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
