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
    domain: '',
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
          domain: String(res.data.domain ?? ''),
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
        <span className="text-slate-500">ກຳລັງໂຫຼດ...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">ຕັ້ງຄ່າຂໍ້ມູນຮ້ານ</h1>
      <p className="text-slate-500 mb-4 sm:mb-6 text-sm sm:text-base">ຊື່ຮ້ານ, ຮູບ, ສີ ແລະຂໍ້ຄວາມ template ສຳລັບ WhatsApp</p>

      <div className="max-w-2xl space-y-4 sm:space-y-6">
        {/* รูปโปรไฟล์ / หน้าปก */}
        <div className="card-admin">
          <h2 className="font-semibold text-slate-800 mb-4">ຮູບພາບ</h2>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">ຮູບໂປຣໄຟລ໌ຮ້ານ (Avatar)</p>
              <div className="flex items-center gap-3">
                {shop?.avatar_key ? (
                  <img
                    src={imgUrl(shop.avatar_key as string)}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs">
                    ບໍ່ມີຮູບ
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
                  ອັບໂຫຼດ
                </button>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">ຮູບຫນ້າປົກ (Cover)</p>
              <div className="flex items-center gap-3">
                {shop?.cover_key ? (
                  <img
                    src={imgUrl(shop.cover_key as string)}
                    alt=""
                    className="w-32 h-16 object-cover rounded-lg border border-slate-200"
                  />
                ) : (
                  <div className="w-32 h-16 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                    ບໍ່ມີຮູບ
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
                  ອັບໂຫຼດ
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* โดเมนร้าน (สำหรับหน้าร้าน) */}
        <div className="card-admin">
          <h2 className="font-semibold text-slate-800 mb-4">ໂດເມນຮ້ານ (ສຳລັບຫນ້າລູກຄ້າ)</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Subdomain ສຳລັບຫນ້າລູກຄ້າ
            </label>
            <input
              value={form.domain}
              onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
              className="input-admin"
              placeholder="shop1.example.com หรือ myshop.example.com"
            />
            <div className="mt-2 space-y-1">
              <p className="text-xs text-slate-600">
                <strong>ຕົວຢ່າງ Subdomain:</strong>
              </p>
              <ul className="text-xs text-slate-500 list-disc list-inside space-y-0.5">
                <li><code>shop1.example.com</code> - ຮ້ານທີ່ 1</li>
                <li><code>shop2.example.com</code> - ຮ້ານທີ່ 2</li>
                <li><code>myshop.example.com</code> - ຮ້ານຂອງຂ້ອຍ</li>
              </ul>
            </div>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-900 mb-1">📋 ວິທີຕັ້ງຄ່າ:</p>
              <ol className="text-xs text-blue-800 list-decimal list-inside space-y-0.5">
                <li>ໄປທີ່ Cloudflare Dashboard → DNS → Add record</li>
                <li>Type: <code>CNAME</code>, Name: <code>shop1</code>, Target: <code>worker-name.xxx.workers.dev</code></li>
                <li>ໄປທີ່ Worker → Settings → Triggers → Custom Domains → Add</li>
                <li>ລະບົບຈະອອກ SSL ໃຫ້ອັດຕະໂນມັດ</li>
              </ol>
            </div>
            {form.domain && (
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                <p className="text-xs text-green-800">
                  ✅ ລູກຄ້າຈະເຂົ້າມາເບິ່ງຮ້ານທີ່: <strong className="font-mono">https://{form.domain}</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ชื่อร้าน */}
        <div className="card-admin">
          <h2 className="font-semibold text-slate-800 mb-4">ຊື່ຮ້ານ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ຊື່ (ລາວ)</label>
              <input
                value={form.name_lo}
                onChange={(e) => setForm((f) => ({ ...f, name_lo: e.target.value }))}
                className="input-admin"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ຊື່ (English)</label>
              <input
                value={form.name_en}
                onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
                className="input-admin"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">ຄຳອະທິບາຍຮ້ານ (ບໍ່ບັງຄັບ)</label>
            <textarea
              value={form.desc_en}
              onChange={(e) => setForm((f) => ({ ...f, desc_en: e.target.value }))}
              rows={2}
              className="input-admin"
              placeholder="ຄຳອະທິບາຍສັ້ນໆ ກ່ຽວກັບຮ້ານ"
            />
          </div>
        </div>

        {/* สี Gradient */}
        <div className="card-admin">
          <h2 className="font-semibold text-slate-800 mb-4">ສີປະຈຳຮ້ານ (Gradient)</h2>
          
          {/* Preview */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">ຕົວຢ່າງສີທີ່ເລືອກ</label>
            <div
              className="w-full h-20 rounded-lg border-2 border-slate-300 shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${form.theme_primary} 0%, ${form.theme_secondary} 100%)`,
              }}
            />
          </div>

          {/* Gradient Presets */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-3">ເລືອກ Gradient</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                { name: 'ຟ້າ', primary: '#3b82f6', secondary: '#1e40af' },
                { name: 'ຂຽວ', primary: '#10b981', secondary: '#047857' },
                { name: 'ສົ້ມ', primary: '#f59e0b', secondary: '#d97706' },
                { name: 'ສົ້ມແດງ', primary: '#ef4444', secondary: '#dc2626' },
                { name: 'ມ່ວງ', primary: '#8b5cf6', secondary: '#7c3aed' },
                { name: 'ບົວ', primary: '#ec4899', secondary: '#db2777' },
                { name: 'ຟ້າອ່າງ', primary: '#06b6d4', secondary: '#0891b2' },
                { name: 'ຂຽວຟ້າ', primary: '#14b8a6', secondary: '#0d9488' },
                { name: 'ສົ້ມຂຽວ', primary: '#84cc16', secondary: '#65a30d' },
                { name: 'ແດງ', primary: '#f97316', secondary: '#ea580c' },
                { name: 'ຊົມ', primary: '#6366f1', secondary: '#4f46e5' },
                { name: 'ດຳ', primary: '#1f2937', secondary: '#111827' },
              ].map((gradient, idx) => {
                const isSelected = form.theme_primary === gradient.primary && form.theme_secondary === gradient.secondary;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, theme_primary: gradient.primary, theme_secondary: gradient.secondary }))}
                    className={`relative h-16 rounded-lg border-2 transition-all ${
                      isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-300 hover:border-slate-400'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${gradient.primary} 0%, ${gradient.secondary} 100%)`,
                    }}
                    title={gradient.name}
                  >
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Colors (Optional) */}
          <details className="mt-4">
            <summary className="text-sm font-medium text-slate-700 cursor-pointer hover:text-slate-900">
              ປັບແຕ່ງສີເພີ່ມເຕີມ (ທາງເລືອກ)
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ສີຫຼັກ</label>
                <input
                  type="color"
                  value={form.theme_primary}
                  onChange={(e) => setForm((f) => ({ ...f, theme_primary: e.target.value }))}
                  className="w-full h-10 rounded border border-slate-300 cursor-pointer"
                />
                <code className="text-xs text-slate-500 mt-1 block">{form.theme_primary}</code>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ສີຮອງ</label>
                <input
                  type="color"
                  value={form.theme_secondary}
                  onChange={(e) => setForm((f) => ({ ...f, theme_secondary: e.target.value }))}
                  className="w-full h-10 rounded border border-slate-300 cursor-pointer"
                />
                <code className="text-xs text-slate-500 mt-1 block">{form.theme_secondary}</code>
              </div>
            </div>
          </details>
        </div>

        {/* WhatsApp template */}
        <div className="card-admin">
          <h2 className="font-semibold text-slate-800 mb-4">ຂໍ້ຄວາມ template ສຳລັບ WhatsApp</h2>
          <p className="text-sm text-slate-500 mb-2">
            ໃຊ້ຕົວແປ: {'{{product_name}}'}, {'{{qty}}'}, {'{{price}}'}, {'{{customer_name}}'}, {'{{customer_phone}}'}, {'{{customer_address}}'}, {'{{note}}'}
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
          {saving ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກ'}
        </button>
      </div>
    </div>
  );
}
