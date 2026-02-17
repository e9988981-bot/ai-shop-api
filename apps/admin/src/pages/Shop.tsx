import { useEffect, useState, useRef } from 'react';
import { apiGet, apiPut, apiPost } from '@/lib/api';

function imgUrl(key: string | null): string {
  if (!key) return '';
  return `/api/public/images/${encodeURIComponent(key)}`;
}

export default function Shop() {
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
    const signRes = await apiPost<{ uploadUrl: string; r2Key: string }>('/api/admin/uploads/sign', {
      ext: file.name.split('.').pop() || 'jpg',
    });
    if (!signRes.ok || !signRes.data) return;
    const { uploadUrl, r2Key } = signRes.data;
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      credentials: 'include',
      headers: { 'Content-Type': file.type || 'image/jpeg' },
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-slate-500">กำลังโหลด...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">ตั้งค่าข้อมูลร้าน</h1>
      <p className="text-slate-500 mb-4 sm:mb-6 text-sm sm:text-base">ชื่อร้าน, รูป, สี และข้อความ template สำหรับ WhatsApp</p>

      <div className="max-w-2xl space-y-4 sm:space-y-6">
        {/* รูปโปรไฟล์ / หน้าปก */}
        <div className="card-admin">
          <h2 className="font-semibold text-slate-800 mb-4">รูปภาพ</h2>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">รูปโปรไฟล์ร้าน (Avatar)</p>
              <div className="flex items-center gap-3">
                {shop?.avatar_key ? (
                  <img
                    src={imgUrl(shop.avatar_key as string)}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs">
                    ไม่มีรูป
                  </div>
                )}
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
                  type="button"
                  onClick={() => avatarRef.current?.click()}
                  className="btn-secondary text-sm"
                >
                  อัปโหลด
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">รูปหน้าปก (Cover)</p>
              <div className="flex items-center gap-3">
                {shop?.cover_key ? (
                  <img
                    src={imgUrl(shop.cover_key as string)}
                    alt=""
                    className="w-32 h-16 object-cover rounded-lg border border-slate-200"
                  />
                ) : (
                  <div className="w-32 h-16 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                    ไม่มีรูป
                  </div>
                )}
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
                  type="button"
                  onClick={() => coverRef.current?.click()}
                  className="btn-secondary text-sm"
                >
                  อัปโหลด
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ชื่อร้าน */}
        <div className="card-admin">
          <h2 className="font-semibold text-slate-800 mb-4">ชื่อร้าน</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ (ลาว)</label>
              <input
                value={form.name_lo}
                onChange={(e) => setForm((f) => ({ ...f, name_lo: e.target.value }))}
                className="input-admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ (English)</label>
              <input
                value={form.name_en}
                onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
                className="input-admin"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">คำอธิบายร้าน (ไม่บังคับ)</label>
            <textarea
              value={form.desc_en}
              onChange={(e) => setForm((f) => ({ ...f, desc_en: e.target.value }))}
              rows={2}
              className="input-admin"
              placeholder="คำอธิบายสั้นๆ เกี่ยวกับร้าน"
            />
          </div>
        </div>

        {/* สี */}
        <div className="card-admin">
          <h2 className="font-semibold text-slate-800 mb-4">สีประจำร้าน</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">สีหลัก</label>
              <input
                type="color"
                value={form.theme_primary}
                onChange={(e) => setForm((f) => ({ ...f, theme_primary: e.target.value }))}
                className="w-full h-10 rounded border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">สีรอง</label>
              <input
                type="color"
                value={form.theme_secondary}
                onChange={(e) => setForm((f) => ({ ...f, theme_secondary: e.target.value }))}
                className="w-full h-10 rounded border border-slate-300"
              />
            </div>
          </div>
        </div>

        {/* WhatsApp template */}
        <div className="card-admin">
          <h2 className="font-semibold text-slate-800 mb-4">ข้อความ template สำหรับ WhatsApp</h2>
          <p className="text-sm text-slate-500 mb-2">
            ใช้ตัวแปร: {'{{product_name}}'}, {'{{qty}}'}, {'{{price}}'}, {'{{customer_name}}'}, {'{{customer_phone}}'}, {'{{customer_address}}'}, {'{{note}}'}
          </p>
          <textarea
            value={form.wa_template}
            onChange={(e) => setForm((f) => ({ ...f, wa_template: e.target.value }))}
            rows={5}
            className="input-admin font-mono text-sm"
            placeholder="Hi! I would like to order..."
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>
    </div>
  );
}
