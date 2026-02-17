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

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    domain: '',
    shop_name_lo: '',
    shop_name_en: '',
    email: '',
    password: '',
    confirmPassword: '',
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

    // Validation
    if (form.password !== form.confirmPassword) {
      setError('ລະຫັດຜ່ານບໍ່ກົງກັນ');
      setLoading(false);
      return;
    }

    if (form.password.length < 8) {
      setError('ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 8 ຕົວອັກສອນ');
      setLoading(false);
      return;
    }

    const payload = {
      domain: toHostname(form.domain) || form.domain,
      shop_name_lo: form.shop_name_lo,
      shop_name_en: form.shop_name_en,
      email: form.email,
      password: form.password,
    };

    const res = await apiPost<{ shopId: number }>('/api/admin/bootstrap', payload);
    setLoading(false);
    if (res.ok) {
      navigate('/login', { replace: true, state: { message: 'ສ້າງຮ້ານສຳເລັດ! ກະລຸນາເຂົ້າສູ່ລະບົບ.' } });
    } else {
      setError(res.error || 'ບໍ່ສາມາດສ້າງຮ້ານໄດ້');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* หัวข้อ */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">ສ້າງຮ້ານໃໝ່</h1>
          <p className="text-slate-500 mt-1">ສະມັກສ້າງຮ້ານແລະບັນຊີຜູ້ດູແລ</p>
        </div>

        {/* ฟอร์มสมัคร */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-slate-700 mb-1">
                Subdomain (ສຳລັບຫນ້າລູກຄ້າ)
              </label>
              <input
                id="domain"
                name="domain"
                type="text"
                required
                value={form.domain}
                onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                placeholder="shop1.example.com หรือ myshop.example.com"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-2 space-y-1">
                <p className="text-xs text-slate-600">
                  <strong>ຕົວຢ່າງ:</strong>
                </p>
                <ul className="text-xs text-slate-500 list-disc list-inside space-y-0.5">
                  <li><code>shop1.example.com</code> - ຮ້ານທີ່ 1</li>
                  <li><code>shop2.example.com</code> - ຮ້ານທີ່ 2</li>
                  <li><code>myshop.example.com</code> - ຮ້ານຂອງຂ້ອຍ</li>
                </ul>
              </div>
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                <strong>⚠️ ສຳຄັນ:</strong> ຫຼັງສ້າງຮ້ານແລ້ວ ຕ້ອງຕັ້ງຄ່າ DNS ໃນ Cloudflare ແລະເພີ່ມ Custom Domain ໃນ Worker ດ້ວຍ
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="shop_name_lo" className="block text-sm font-medium text-slate-700 mb-1">
                  ຊື່ຮ້ານ (ລາວ)
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
                  ຊື່ຮ້ານ (English)
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
                ອີເມວຜູ້ດູແລ (ໃຊ້ເຂົ້າສູ່ລະບົບ)
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
                ລະຫັດຜ່ານ (ຢ່າງໜ້ອຍ 8 ຕົວອັກສອນ)
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
                ຢືນຢັນລະຫັດຜ່ານ
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
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
              {loading ? 'ກຳລັງສ້າງຮ້ານ...' : 'ສ້າງຮ້ານ'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
              ມີບັນຊີແລ້ວ? ເຂົ້າສູ່ລະບົບ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
