import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiPost } from '@/lib/api';

function toHostname(value: string): string {
  const s = value.trim().replace(/\/+$/, '');
  if (!s) return s;
  try {
    const url = s.startsWith('http') ? new URL(s) : new URL('https://' + s);
    return url.hostname;
  } catch {
    return s.toLowerCase();
  }
}

export default function Bootstrap() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    domain: '',
    shop_name_lo: '',
    shop_name_en: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!form.domain && typeof window !== 'undefined') {
      setForm((f) => ({ ...f, domain: window.location.hostname }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const payload = { ...form, domain: toHostname(form.domain) || form.domain };
    const res = await apiPost<{ shopId: number }>('/api/admin/bootstrap', payload);
    setLoading(false);
    if (res.ok) {
      navigate('/login', { replace: true });
    } else {
      setError(res.error || 'สร้างร้านไม่สำเร็จ');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <Link to="/login" className="text-sm text-slate-500 hover:text-slate-700">
            ← กลับไปเข้าสู่ระบบ
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h1 className="text-xl font-bold text-slate-800 mb-1">สร้างร้านและบัญชีผู้ดูแล (ครั้งแรกเท่านั้น)</h1>
          <p className="text-slate-500 text-sm mb-6">
            เมื่อสร้างแล้ว จะใช้ลิงก์นี้เข้าสู่ระบบด้วยอีเมลและรหัสผ่านด้านล่าง
          </p>

          {/* คำแนะนำแบบขั้นตอน */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6 text-sm text-slate-700 space-y-2">
            <p className="font-medium text-slate-800">วิธีสร้าง user แรก</p>
            <ol className="list-decimal list-inside space-y-1">
              <li><strong>โดเมน</strong> — ใส่โดเมนของ Worker นี้ (ระบบจะเติมให้อัตโนมัติ)</li>
              <li><strong>ชื่อร้าน</strong> — ชื่อที่แสดงบนหน้าร้าน (ลาว / อังกฤษ)</li>
              <li><strong>อีเมล + รหัสผ่าน</strong> — ใช้เข้าหลังบ้านครั้งถัดไป (รหัสอย่างน้อย 8 ตัว)</li>
              <li>กด <strong>สร้างร้าน</strong> แล้วไปหน้าเข้าสู่ระบบ เพื่อล็อกอินด้วยบัญชีที่สร้างไว้</li>
            </ol>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-slate-700 mb-1">
                โดเมน (Domain)
              </label>
              <input
                id="domain"
                name="domain"
                type="text"
                required
                value={form.domain}
                onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                placeholder="เช่น ai-shop-api.xxx.workers.dev"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">ใช้โดเมนของ Worker นี้ (อยู่บน URL ด้านบน)</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="shop_name_lo" className="block text-sm font-medium text-slate-700 mb-1">
                  ชื่อร้าน (ลาว)
                </label>
                <input
                  id="shop_name_lo"
                  name="shop_name_lo"
                  type="text"
                  required
                  value={form.shop_name_lo}
                  onChange={(e) => setForm((f) => ({ ...f, shop_name_lo: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ຮ້ານຂອງຂ້ອຍ"
                />
              </div>
              <div>
                <label htmlFor="shop_name_en" className="block text-sm font-medium text-slate-700 mb-1">
                  ชื่อร้าน (English)
                </label>
                <input
                  id="shop_name_en"
                  name="shop_name_en"
                  type="text"
                  required
                  value={form.shop_name_en}
                  onChange={(e) => setForm((f) => ({ ...f, shop_name_en: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="My Shop"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                อีเมลผู้ดูแล (ใช้เข้าสู่ระบบ)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                รหัสผ่าน (อย่างน้อย 8 ตัว)
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {loading ? 'กำลังสร้างร้าน...' : 'สร้างร้าน'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
