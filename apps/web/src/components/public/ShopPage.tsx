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
    <div className="min-h-screen">
      <div className="absolute top-4 right-4 z-10">
        <LocaleToggle />
      </div>
      {shop && (
        <header
          className="relative h-48 md:h-64"
          style={{ backgroundColor: shop.theme_primary }}
        >
          {shop.cover_key && (
            <img
              src={imgUrl(shop.cover_key)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
          )}
          <div className="relative flex items-center gap-4 p-4 h-full">
            {shop.avatar_key && (
              <img
                src={imgUrl(shop.avatar_key)}
                alt=""
                className="w-16 h-16 md:w-24 md:h-24 rounded-full object-cover border-4 border-white shadow"
              />
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow">
                {getBilingual(locale, { lo: shop.name_lo, en: shop.name_en })}
              </h1>
              {(shop.desc_lo || shop.desc_en) && (
                <p className="text-white/90 mt-1 line-clamp-2">
                  {getBilingual(locale, { lo: shop.desc_lo || '', en: shop.desc_en || '' })}
                </p>
              )}
            </div>
          </div>
        </header>
      )}

      <main className="max-w-4xl mx-auto p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            placeholder={locale === 'lo' ? 'ຄົ້ນຫາ' : 'Search'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[120px] px-3 py-2 border rounded-lg"
          />
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="px-3 py-2 border rounded-lg"
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
          <div className="text-center py-12 text-gray-500">
            {locale === 'lo' ? 'ກຳລັງໂຫລດ...' : 'Loading...'}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="block bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden border border-gray-100"
              >
                <div className="aspect-square bg-gray-100">
                  {p.cover_image ? (
                    <img
                      src={imgUrl(p.cover_image)}
                      alt={getBilingual(locale, { lo: p.name_lo, en: p.name_en })}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium line-clamp-2">
                    {getBilingual(locale, { lo: p.name_lo, en: p.name_en })}
                  </h3>
                  <p className="text-lg font-bold mt-1" style={{ color: shop?.theme_primary || '#2563eb' }}>
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
