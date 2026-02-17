import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '@/lib/api';

function imgUrl(key: string | null): string {
  if (!key) return '';
  return `/api/public/images/${encodeURIComponent(key)}`;
}

interface Product {
  id: number;
  slug: string;
  name_lo: string;
  name_en: string;
  price: number;
  status: string;
  cover_image: string | null;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    load();
  }, [statusFilter]);

  const load = () => {
    setError('');
    const params = new URLSearchParams({ page: '1', limit: '100' });
    if (statusFilter) params.append('status', statusFilter);
    apiGet<{ items: Product[]; total: number }>(`/api/admin/products?${params}`).then((res) => {
      if (res.ok && res.data) {
        setProducts(res.data.items || []);
        setTotal(res.data.total ?? 0);
        if (res.data.total === 0 && !statusFilter) {
          setError('ยังไม่มีสินค้าในระบบ — กด "เพิ่มสินค้า" เพื่อสร้างสินค้าแรก');
        }
      } else {
        const errMsg = res.error || 'ไม่สามารถโหลดรายการสินค้าได้';
        console.error('Failed to load products:', res.error, res.status);
        setError(errMsg);
        setProducts([]);
        setTotal(0);
      }
      setLoading(false);
    }).catch((e) => {
      console.error('Error loading products:', e);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      setLoading(false);
    });
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">สินค้า</h1>
          {total > 0 && (
            <p className="text-slate-500 text-sm mt-1">ทั้งหมด {total} รายการ</p>
          )}
        </div>
        <Link to="/products/new" className="btn-primary">
          เพิ่มสินค้า
        </Link>
      </div>
      
      {/* Filter */}
      <div className="mb-4 flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-admin w-48"
        >
          <option value="">ทุกสถานะ</option>
          <option value="draft">แบบร่าง</option>
          <option value="published">เผยแพร่</option>
        </select>
      </div>
      
      <p className="text-slate-500 mb-4">คลิกที่สินค้าเพื่อแก้ไขข้อมูลและจัดการรูปภาพ</p>
      
      {error && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${
          error.includes('ยังไม่มี') 
            ? 'bg-blue-50 border border-blue-200 text-blue-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {error}
          {error.includes('ยังไม่มี') && (
            <div className="mt-2">
              <Link to="/products/new" className="text-blue-600 hover:underline font-medium">→ เพิ่มสินค้า</Link>
            </div>
          )}
        </div>
      )}
      
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left py-2 px-3 text-slate-600 font-medium w-14">รูป</th>
              <th className="text-left py-2 px-3 text-slate-600 font-medium">ชื่อ</th>
              <th className="text-left py-2 px-3 text-slate-600 font-medium">Slug</th>
              <th className="text-left py-2 px-3 text-slate-600 font-medium">ราคา</th>
              <th className="text-left py-2 px-3 text-slate-600 font-medium">สถานะ</th>
              <th className="text-left py-2 px-3 text-slate-600 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  {error ? error : 'ยังไม่มีสินค้า — '}
                  {!error && <Link to="/products/new" className="text-blue-600 hover:underline">เพิ่มสินค้า</Link>}
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="py-3 px-4">
                    {p.cover_image ? (
                      <img src={imgUrl(p.cover_image)} alt="" className="w-12 h-12 object-cover rounded border border-slate-200" />
                    ) : (
                      <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-xs border border-slate-300">
                        ไม่มีรูป
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{p.name_lo || p.name_en}</div>
                    {(p.name_lo && p.name_en) && (
                      <div className="text-xs text-slate-500 mt-0.5">{p.name_en}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <code className="text-xs text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded">{p.slug}</code>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800">৳{p.price.toLocaleString()}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      p.status === 'published' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {p.status === 'published' ? 'เผยแพร่' : 'แบบร่าง'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Link to={`/products/${p.id}`} className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                      แก้ไข →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
