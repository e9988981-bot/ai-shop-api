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
      <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">เบอร์ WhatsApp</h1>
      <p className="text-slate-500 mb-4 sm:mb-6 text-sm sm:text-base">
        เบอร์ที่ใช้รับออเดอร์จากลูกค้า (ลูกค้าสั่งแล้วจะได้ลิงก์แชร์ไปเบอร์ที่เลือก) — อย่างน้อย 1 เบอร์
      </p>

      <div className="max-w-xl space-y-4 sm:space-y-6">
        <div className="card-admin">
          <h2 className="font-semibold text-slate-800 mb-4">เพิ่มเบอร์</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ (เช่น เบอร์หลัก)</label>
                <input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  className="input-admin"
                  placeholder="เบอร์หลัก"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์ (E.164 เช่น +8562012345678)</label>
                <input
                  value={form.phone_e164}
                  onChange={(e) => setForm((f) => ({ ...f, phone_e164: e.target.value }))}
                  className="input-admin"
                  placeholder="+8562012345678"
                  required
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
                className="rounded"
              />
              เป็นค่าเริ่มต้น
            </label>
            <button type="submit" className="btn-primary">
              เพิ่มเบอร์
            </button>
          </form>
        </div>

        <div className="card-admin">
          <h2 className="font-semibold text-slate-800 mb-4">รายการเบอร์</h2>
          {items.length === 0 ? (
            <p className="text-slate-500 text-sm">ยังไม่มีเบอร์ — เพิ่มด้านบน</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-b border-slate-100 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800">{item.label}</div>
                    <div className="text-slate-600 font-mono text-sm break-all">{item.phone_e164}</div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {!item.is_default && (
                      <button
                        type="button"
                        onClick={() => setDefault(item.id)}
                        className="text-xs sm:text-sm px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 whitespace-nowrap"
                      >
                        ตั้งเป็นค่าเริ่มต้น
                      </button>
                    )}
                    {item.is_default && (
                      <span className="text-xs sm:text-sm text-green-600 font-medium px-2 py-1.5">ค่าเริ่มต้น</span>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="text-xs sm:text-sm px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 whitespace-nowrap"
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
