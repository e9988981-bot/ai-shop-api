import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiGet, apiPost } from '@/lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    apiGet<{ email: string }>('/api/auth/me').then((res) => {
      if (res.ok && res.data) navigate('/', { replace: true });
      setChecking(false);
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await apiPost<{ userId: number }>('/api/auth/login', { email, password });
    setLoading(false);
    if (res.ok) {
      navigate('/', { replace: true });
    } else {
      setError(res.error || 'เข้าสู่ระบบไม่สำเร็จ');
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-slate-500">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* หัวข้อ */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">หลังบ้าน ai-shop</h1>
          <p className="text-slate-500 mt-1">เข้าสู่ระบบเพื่อจัดการร้าน สินค้า และออเดอร์</p>
        </div>

        {/* บล็อก: ครั้งแรก สร้าง user */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h2 className="font-semibold text-amber-900 mb-1">ครั้งแรกใช้ระบบ?</h2>
          <p className="text-sm text-amber-800 mb-3">
            สร้างร้านและบัญชีผู้ดูแลได้ครั้งเดียว เมื่อยังไม่มี user ในระบบ
          </p>
          <Link
            to="/bootstrap"
            className="inline-block w-full py-2.5 text-center bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition"
          >
            สร้างร้านและบัญชีแรก
          </Link>
        </div>

        {/* ฟอร์มเข้าสู่ระบบ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">เข้าสู่ระบบ</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                อีเมล
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                รหัสผ่าน
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
