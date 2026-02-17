'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, getApiBase } from '@/lib/api';
import { useLocale } from '@/contexts/LocaleContext';
import { LocaleToggle } from '@/components/LocaleToggle';
import { getBilingual } from '@ai-shop/shared';

interface Shop {
  id: number;
  name_lo: string;
  name_en: string;
  desc_lo: string | null;
  desc_en: string | null;
  avatar_key: string | null;
  cover_key: string | null;
  theme_primary: string;
  theme_secondary: string;
}

interface Product {
  id: number;
  slug: string;
  name_lo: string;
  name_en: string;
  price: number;
  cover_image: string | null;
}

interface Category {
  id: number;
  name_lo: string;
  name_en: string;
}

function imgUrl(key: string | null): string {
  if (!key) return '';
  const base = getApiBase();
  return `${base}/api/public/images/${encodeURIComponent(key)}`;
}

export function ShopPage() {
  const { locale } = useLocale();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');

  useEffect(() => {
    (async () => {
      const [shopRes, productsRes, categoriesRes] = await Promise.all([
        apiGet<Shop>('/api/public/shop'),
        apiGet<Product[]>(`/api/public/products?category_id=${categoryId || ''}&search=${encodeURIComponent(search)}`),
        apiGet<Category[]>('/api/public/categories'),
      ]);
      if (shopRes.ok && shopRes.data) setShop(shopRes.data);
      if (productsRes.ok && Array.isArray(productsRes.data)) setProducts(productsRes.data);
      else if (productsRes.ok && productsRes.data && typeof productsRes.data === 'object' && 'items' in productsRes.data) {
        setProducts((productsRes.data as { items: Product[] }).items || []);
      }
      if (categoriesRes.ok && Array.isArray(categoriesRes.data)) setCategories(categoriesRes.data);
      setLoading(false);
    })();
  }, [categoryId, search]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="absolute top-4 right-4 z-10">
        <LocaleToggle />
      </div>
      {shop && (
        <header
          className="relative h-52 md:h-72 overflow-hidden"
          style={{ backgroundColor: shop.theme_primary }}
        >
          {shop.cover_key && (
            <img
              src={imgUrl(shop.cover_key)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-90"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="relative flex items-center gap-4 p-5 md:p-6 h-full">
            {shop.avatar_key && (
              <img
                src={imgUrl(shop.avatar_key)}
                alt=""
                className="w-16 h-16 md:w-24 md:h-24 rounded-full object-cover border-4 border-white shadow-lg flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-md">
                {getBilingual(locale, { lo: shop.name_lo, en: shop.name_en })}
              </h1>
              {(shop.desc_lo || shop.desc_en) && (
                <p className="text-white/95 mt-1 line-clamp-2 drop-shadow">
                  {getBilingual(locale, { lo: shop.desc_lo || '', en: shop.desc_en || '' })}
                </p>
              )}
            </div>
          </div>
        </header>
      )}

      <main className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex flex-wrap gap-3 mb-6 -mt-2 relative z-10">
          <input
            type="text"
            placeholder={locale === 'lo' ? 'ຄົ້ນຫາ' : 'Search'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[140px] px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
          >
            <option value="">{locale === 'lo' ? 'ທຸກໝວດໝູ່' : 'All categories'}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {getBilingual(locale, { lo: c.name_lo, en: c.name_en })}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-500">
            {locale === 'lo' ? 'ກຳລັງໂຫລດ...' : 'Loading...'}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="group block bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden border border-slate-100"
              >
                <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden relative">
                  {p.cover_image ? (
                    <img
                      src={imgUrl(p.cover_image)}
                      alt={getBilingual(locale, { lo: p.name_lo, en: p.name_en })}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // ถ้ารูปโหลดไม่ได้ ให้แสดง placeholder
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.placeholder')) {
                          const placeholder = document.createElement('div');
                          placeholder.className = 'placeholder w-full h-full flex items-center justify-center text-slate-400 text-sm';
                          placeholder.textContent = 'No image';
                          parent.appendChild(placeholder);
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                      <div className="text-center">
                        <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div className="text-xs">No image</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {getBilingual(locale, { lo: p.name_lo, en: p.name_en })}
                  </h3>
                  <p className="text-lg font-bold mt-2" style={{ color: shop?.theme_primary || '#2563eb' }}>
                    ৳{p.price}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
