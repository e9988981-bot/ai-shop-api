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
          setError('ຍັງບໍ່ມີສິນຄ້າໃນລະບົບ — ກົດ "ເພີ່ມສິນຄ້າ" ເພື່ອສ້າງສິນຄ້າຄັ້ງທຳອິດ');
        }
      } else {
        const errMsg = res.error || 'ບໍ່ສາມາດໂຫຼດລາຍການສິນຄ້າໄດ້';
        console.error('Failed to load products:', res.error, res.status);
        setError(errMsg);
        setProducts([]);
        setTotal(0);
      }
      setLoading(false);
    }).catch((e) => {
      console.error('Error loading products:', e);
      setError('ເກີດຂໍ້ຜິດພາດໃນການໂຫຼດຂໍ້ມູນ');
      setLoading(false);
    });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">ສິນຄ້າ</h1>
          {total > 0 && (
            <p className="text-slate-500 text-sm mt-1">ທັງໝົດ {total} ລາຍການ</p>
          )}
        </div>
        <Link to="/products/new" className="btn-primary w-full sm:w-auto text-center">
          ເພີ່ມສິນຄ້າ
        </Link>
      </div>
      
      {/* Filter */}
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-admin w-full sm:w-48"
        >
          <option value="">ທຸກສະຖານະ</option>
          <option value="draft">ຮ່າງ</option>
          <option value="published">ເຜີຍແຜ່</option>
        </select>
      </div>
      
      <p className="text-slate-500 mb-4 text-sm">ກົດທີ່ສິນຄ້າເພື່ອແກ້ໄຂຂໍ້ມູນແລະຈັດການຮູບພາບ</p>
      
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
      
      {/* Mobile: Card view */}
      <div className="md:hidden space-y-3">
        {products.length === 0 && !loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500">
            {error ? error : 'ຍັງບໍ່ມີສິນຄ້າ'}
            {!error && (
              <div className="mt-3">
                <Link to="/products/new" className="btn-primary inline-block">ເພີ່ມສິນຄ້າ</Link>
              </div>
            )}
          </div>
        ) : (
          products.map((p) => (
            <Link
              key={p.id}
              to={`/products/${p.id}`}
              className="block bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow transition"
            >
              <div className="flex gap-3">
                <div className="shrink-0">
                  {p.cover_image ? (
                    <img src={imgUrl(p.cover_image)} alt="" className="w-16 h-16 object-cover rounded border border-slate-200" />
                  ) : (
                    <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-xs border border-slate-300">
                      ບໍ່ມີຮູບ
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 truncate">{p.name_lo || p.name_en}</div>
                  {(p.name_lo && p.name_en) && (
                    <div className="text-xs text-slate-500 truncate">{p.name_en}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-semibold text-slate-800">₭{p.price.toLocaleString()}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === 'published' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {p.status === 'published' ? 'ເຜີຍແຜ່' : 'ຮ່າງ'}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-2 px-3 text-slate-600 font-medium w-14">ຮູບ</th>
                <th className="text-left py-2 px-3 text-slate-600 font-medium">ຊື່</th>
                <th className="text-left py-2 px-3 text-slate-600 font-medium">Slug</th>
                <th className="text-left py-2 px-3 text-slate-600 font-medium">ລາຄາ</th>
                <th className="text-left py-2 px-3 text-slate-600 font-medium">ສະຖານະ</th>
                <th className="text-left py-2 px-3 text-slate-600 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    {error ? error : 'ຍັງບໍ່ມີສິນຄ້າ — '}
                    {!error && <Link to="/products/new" className="text-blue-600 hover:underline">ເພີ່ມສິນຄ້າ</Link>}
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
                          ບໍ່ມີຮູບ
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
                      <span className="font-semibold text-slate-800">₭{p.price.toLocaleString()}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        p.status === 'published' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {p.status === 'published' ? 'ເຜີຍແຜ່' : 'ຮ່າງ'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Link to={`/products/${p.id}`} className="text-blue-600 hover:text-blue-700 hover:underline text-sm font-medium">
                        ແກ້ໄຂ →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
