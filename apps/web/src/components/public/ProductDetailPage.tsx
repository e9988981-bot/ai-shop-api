'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import { getBilingual, t } from '@ai-shop/shared';
import { LocaleToggle } from '@/components/LocaleToggle';

interface OptionValue {
  id: number;
  value_lo: string;
  value_en: string;
}

interface OptionGroup {
  id: number;
  name_lo: string;
  name_en: string;
  is_required: boolean;
  values: OptionValue[];
}

interface WaNumber {
  id: number;
  label: string;
  phone_e164: string;
}

interface Product {
  id: number;
  name_lo: string;
  name_en: string;
  desc_lo: string | null;
  desc_en: string | null;
  price: number;
  images: { id: number; r2_key: string; sort_order: number }[];
  option_groups: OptionGroup[];
  wa_numbers: WaNumber[];
}

function imgUrl(key: string): string {
  return `/api/public/images/${encodeURIComponent(key)}`;
}

export function ProductDetailPage({ slug }: { slug: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useLocale();
  const resolvedSlug = pathname?.match(/\/products\/([^/]+)/)?.[1] || slug;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [waNumberId, setWaNumberId] = useState<number | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    (async () => {
      const res = await apiGet<Product>(`/api/public/products/${resolvedSlug}`);
      if (res.ok && res.data) {
        setProduct(res.data);
        if (res.data.wa_numbers?.length) {
          const def = res.data.wa_numbers.find((n) => n.id);
          setWaNumberId(def?.id ?? res.data.wa_numbers[0].id);
        }
      }
      setLoading(false);
    })();
  }, [resolvedSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !waNumberId) return;
    setSubmitting(true);
    setError('');
    const res = await apiPost<{ wa_url: string }>('/api/public/orders', {
      product_id: product.id,
      wa_number_id: waNumberId,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      qty,
      note,
      selected_options: selectedOptions,
    });
    setSubmitting(false);
    if (res.ok && res.data?.wa_url) {
      window.location.href = res.data.wa_url;
    } else {
      setError(res.error || t(locale, 'order.error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {locale === 'lo' ? 'ກຳລັງໂຫລດ...' : 'Loading...'}
      </div>
    );
  }
  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>{locale === 'lo' ? 'ບໍ່ພົບສິນຄ້າ' : 'Product not found'}</p>
      </div>
    );
  }

  const images = product.images || [];
  const currentImage = images[imageIndex] || images[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex justify-end items-center gap-2 p-4">
        <Link
          href="/admin/login"
          className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          {locale === 'lo' ? 'ເຂົ້າສູ່ລະບົບ' : 'Admin'}
        </Link>
        <LocaleToggle />
      </div>
      <main className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="aspect-square bg-gray-100 relative">
            {currentImage ? (
              <img
                src={imgUrl(currentImage.r2_key)}
                alt=""
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No image
              </div>
            )}
            {images.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImageIndex(i)}
                    className={`w-2 h-2 rounded-full ${
                      i === imageIndex ? 'bg-blue-600' : 'bg-white/80'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="p-4">
            <h1 className="text-xl font-bold">
              {getBilingual(locale, { lo: product.name_lo, en: product.name_en })}
            </h1>
            <p className="text-2xl font-bold text-blue-600 mt-2">৳{product.price}</p>
            {(product.desc_lo || product.desc_en) && (
              <p className="mt-4 text-gray-600">
                {getBilingual(locale, { lo: product.desc_lo || '', en: product.desc_en || '' })}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {product.option_groups?.map((g) => (
            <div key={g.id}>
              <label className="block text-sm font-medium mb-1">
                {getBilingual(locale, { lo: g.name_lo, en: g.name_en })}
                {g.is_required && ' *'}
              </label>
              <select
                required={g.is_required}
                value={selectedOptions[String(g.id)] || ''}
                onChange={(e) =>
                  setSelectedOptions((o) => ({ ...o, [String(g.id)]: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">-- {t(locale, 'product.select_options')} --</option>
                {g.values?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {getBilingual(locale, { lo: v.value_lo, en: v.value_en })}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {product.wa_numbers?.length > 1 && (
            <div>
              <label className="block text-sm font-medium mb-1">WhatsApp</label>
              <select
                value={waNumberId ?? ''}
                onChange={(e) => setWaNumberId(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {product.wa_numbers.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label} ({n.phone_e164})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              {t(locale, 'form.name')} *
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t(locale, 'form.phone')} *
            </label>
            <input
              type="tel"
              required
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t(locale, 'form.address')}
            </label>
            <textarea
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t(locale, 'product.quantity')} *
            </label>
            <input
              type="number"
              min={1}
              max={999}
              required
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t(locale, 'product.note')}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? '...' : t(locale, 'product.whatsapp_order')}
          </button>
        </form>
      </main>
    </div>
  );
}
