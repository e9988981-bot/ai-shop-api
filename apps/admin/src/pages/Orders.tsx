import { useEffect, useState } from 'react';
import { apiGet, apiPut } from '@/lib/api';

interface Order {
  id: number;
  product_id: number;
  product_name_lo?: string;
  product_name_en?: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  qty: number;
  note: string;
  status: 'new' | 'contacted' | 'done' | 'canceled';
  created_at: string;
  wa_message?: string;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const limit = 20;

  useEffect(() => {
    load();
  }, [page, statusFilter, search]);

  const load = () => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (statusFilter) params.append('status', statusFilter);
    if (search) params.append('search', search);
    apiGet<{ items: Order[]; total: number; page: number; limit: number }>(`/api/admin/orders?${params}`).then((res) => {
      if (res.ok && res.data) {
        setOrders(res.data.items || []);
        setTotal(res.data.total || 0);
      }
      setLoading(false);
    });
  };

  const updateStatus = async (id: number, newStatus: Order['status']) => {
    const res = await apiPut(`/api/admin/orders?id=${id}`, { status: newStatus });
    if (res.ok) load();
  };

  const getStatusLabel = (status: Order['status']) => {
    const labels: Record<Order['status'], string> = {
      new: 'ใหม่',
      contacted: 'ติดต่อแล้ว',
      done: 'เสร็จสิ้น',
      canceled: 'ยกเลิก',
    };
    return labels[status];
  };

  const getStatusColor = (status: Order['status']) => {
    const colors: Record<Order['status'], string> = {
      new: 'bg-blue-100 text-blue-700',
      contacted: 'bg-yellow-100 text-yellow-700',
      done: 'bg-green-100 text-green-700',
      canceled: 'bg-red-100 text-red-700',
    };
    return colors[status];
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">ออเดอร์</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">จัดการออเดอร์จากลูกค้า</p>
        </div>
        <a
          href={`/api/admin/orders/export.csv${statusFilter ? `?status=${statusFilter}` : ''}`}
          className="btn-secondary w-full sm:w-auto text-center"
          download
        >
          ส่งออก CSV
        </a>
      </div>

      {/* Filters */}
      <div className="card-admin mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="ค้นหาชื่อ/เบอร์/สินค้า..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input-admin flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="input-admin w-full sm:w-48"
          >
            <option value="">ทุกสถานะ</option>
            <option value="new">ใหม่</option>
            <option value="contacted">ติดต่อแล้ว</option>
            <option value="done">เสร็จสิ้น</option>
            <option value="canceled">ยกเลิก</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {orders.length === 0 ? (
          <div className="p-6 sm:p-8 text-center text-slate-500">
            {search || statusFilter ? 'ไม่พบออเดอร์ที่ค้นหา' : 'ยังไม่มีออเดอร์'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((order) => (
              <div key={order.id} className="p-4 sm:p-5 hover:bg-slate-50 transition">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-500">
                        #{order.id} • {new Date(order.created_at).toLocaleString('th-TH')}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-2 text-sm sm:text-base">
                      {order.product_name_lo || order.product_name_en
                        ? `${order.product_name_lo || ''}${order.product_name_lo && order.product_name_en ? ' / ' : ''}${order.product_name_en || ''}`
                        : `สินค้า ID: ${order.product_id}`}
                    </h3>
                    <div className="text-xs sm:text-sm text-slate-600 space-y-1">
                      <p>
                        <span className="font-medium">ชื่อ:</span> {order.customer_name}
                      </p>
                      <p>
                        <span className="font-medium">เบอร์:</span>{' '}
                        <a href={`tel:${order.customer_phone}`} className="text-blue-600 hover:underline break-all">
                          {order.customer_phone}
                        </a>
                      </p>
                      {order.customer_address && (
                        <p className="break-words">
                          <span className="font-medium">ที่อยู่:</span> {order.customer_address}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">จำนวน:</span> {order.qty} ชิ้น
                      </p>
                      {order.note && (
                        <p className="break-words">
                          <span className="font-medium">หมายเหตุ:</span> {order.note}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                    {order.status === 'new' && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateStatus(order.id, 'contacted')}
                          className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 text-sm font-medium"
                        >
                          ติดต่อแล้ว
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(order.id, 'done')}
                          className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm font-medium"
                        >
                          เสร็จสิ้น
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(order.id, 'canceled')}
                          className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium"
                        >
                          ยกเลิก
                        </button>
                      </>
                    )}
                    {order.status === 'contacted' && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateStatus(order.id, 'done')}
                          className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm font-medium"
                        >
                          เสร็จสิ้น
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(order.id, 'canceled')}
                          className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium"
                        >
                          ยกเลิก
                        </button>
                      </>
                    )}
                    {(order.status === 'done' || order.status === 'canceled') && (
                      <span className="text-xs text-slate-400 text-center sm:text-left">ไม่สามารถเปลี่ยนสถานะได้</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
          <p className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
            แสดง {Math.min((page - 1) * limit + 1, total)}-{Math.min(page * limit, total)} จาก {total} ออเดอร์
          </p>
          <div className="flex gap-2 justify-center sm:justify-end">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary disabled:opacity-50"
            >
              ← ก่อนหน้า
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= total}
              className="btn-secondary disabled:opacity-50"
            >
              ถัดไป →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
