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

  useEffect(() => {
    apiGet<{ items: Product[]; total: number }>('/api/admin/products?page=1&limit=100').then((res) => {
      if (res.ok && res.data) {
        setProducts(res.data.items || []);
        setTotal(res.data.total ?? 0);
      }
      setLoading(false);
    });
  }, []);

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
        <h1 className="text-2xl font-bold text-slate-800">สินค้า</h1>
        <Link
          to="/products/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          เพิ่มสินค้า
        </Link>
      </div>
      <p className="text-slate-500 mb-4">คลิกที่สินค้าเพื่อแก้ไขข้อมูลและจัดการรูปภาพ</p>
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
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  ยังไม่มีสินค้า — <Link to="/products/new" className="text-blue-600 hover:underline">เพิ่มสินค้า</Link>
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3">
                    {p.cover_image ? (
                      <img src={imgUrl(p.cover_image)} alt="" className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-xs">ไม่มี</div>
                    )}
                  </td>
                  <td className="py-2 px-3">{p.name_lo} / {p.name_en}</td>
                  <td className="py-2 px-3 text-slate-600">{p.slug}</td>
                  <td className="py-2 px-3">{p.price}</td>
                  <td className="py-2 px-3">
                    <span className={p.status === 'published' ? 'text-green-600' : 'text-slate-500'}>
                      {p.status === 'published' ? 'เผยแพร่' : 'แบบร่าง'}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <Link to={`/products/${p.id}`} className="text-blue-600 hover:underline text-sm">
                      แก้ไข
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {total > 0 && (
        <p className="text-slate-500 text-sm mt-2">ทั้งหมด {total} รายการ</p>
      )}
    </div>
  );
}
