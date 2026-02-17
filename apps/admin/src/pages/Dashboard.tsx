import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '@/lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState<{ products: number; orders: number } | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<{ items: unknown[]; total: number }>('/api/admin/products?page=1&limit=1'),
      apiGet<{ items: unknown[]; total: number }>('/api/admin/orders?page=1&limit=1'),
    ]).then(([pRes, oRes]) => {
      setStats({
        products:
          pRes.ok && pRes.data && 'total' in pRes.data && typeof (pRes.data as { total: number }).total === 'number'
            ? (pRes.data as { total: number }).total
            : 0,
        orders:
          oRes.ok && oRes.data && 'total' in oRes.data && typeof (oRes.data as { total: number }).total === 'number'
            ? (oRes.data as { total: number }).total
            : 0,
      });
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">แดชบอร์ด</h1>
      <p className="text-slate-500 mb-6">ภาพรวมร้านและจุดเริ่มต้นตั้งค่า</p>

      {/* คู่มือตั้งค่า (ครั้งแรก) */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <h2 className="font-semibold text-blue-900 mb-2">แนะนำการตั้งค่า (ทำตามลำดับ)</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>
            <Link to="/shop" className="underline font-medium hover:text-blue-600">
              ตั้งค่าข้อมูลร้าน
            </Link>
            — ชื่อร้าน, รูป, สี, ข้อความ template สำหรับ WhatsApp
          </li>
          <li>
            <Link to="/wa-numbers" className="underline font-medium hover:text-blue-600">
              เพิ่มเบอร์ WhatsApp
            </Link>
            — เบอร์ที่รับออเดอร์จากลูกค้า (อย่างน้อย 1 เบอร์)
          </li>
          <li>
            <Link to="/categories" className="underline font-medium hover:text-blue-600">
              สร้างหมวดหมู่
            </Link>
            — (ถ้าต้องการจัดกลุ่มสินค้า)
          </li>
          <li>
            <Link to="/products/new" className="underline font-medium hover:text-blue-600">
              เพิ่มสินค้า
            </Link>
            — ตั้งเป็น Published ถึงจะโชว์บนหน้าร้าน
          </li>
          <li>
            <Link to="/orders" className="underline font-medium hover:text-blue-600">
              ดูออเดอร์
            </Link>
            — รับออเดอร์จากลูกค้าผ่านลิงก์ WhatsApp
          </li>
        </ol>
      </div>

      {/* สถิติย่อ */}
      {stats !== null && (
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-slate-500 text-sm">สินค้า</p>
            <p className="text-2xl font-bold text-slate-800">{stats.products}</p>
            <Link to="/products" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
              จัดการสินค้า →
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-slate-500 text-sm">ออเดอร์</p>
            <p className="text-2xl font-bold text-slate-800">{stats.orders}</p>
            <Link to="/orders" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
              ดูออเดอร์ →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
