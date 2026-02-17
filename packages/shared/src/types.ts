export type Locale = 'lo' | 'en';

export interface Bilingual {
  lo: string;
  en: string;
}

export interface Shop {
  id: number;
  domain: string;
  name_lo: string;
  name_en: string;
  desc_lo: string | null;
  desc_en: string | null;
  avatar_key: string | null;
  cover_key: string | null;
  theme_primary: string;
  theme_secondary: string;
  wa_template: string | null;
  created_at: string;
}

export interface User {
  id: number;
  shop_id: number;
  email: string;
  role: 'owner' | 'admin';
  created_at: string;
  last_login_at: string | null;
}

export interface WaNumber {
  id: number;
  shop_id: number;
  label: string;
  phone_e164: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  shop_id: number;
  name_lo: string;
  name_en: string;
  sort_order: number;
  created_at?: string;
}

export interface ProductImage {
  id: number;
  shop_id: number;
  product_id: number;
  r2_key: string;
  sort_order: number;
  created_at: string;
}

export interface OptionGroup {
  id: number;
  shop_id: number;
  product_id: number;
  name_lo: string;
  name_en: string;
  is_required: boolean;
  sort_order: number;
  values?: OptionValue[];
}

export interface OptionValue {
  id: number;
  shop_id: number;
  group_id: number;
  value_lo: string;
  value_en: string;
  sort_order: number;
}

export interface Product {
  id: number;
  shop_id: number;
  category_id: number | null;
  slug: string;
  name_lo: string;
  name_en: string;
  desc_lo: string | null;
  desc_en: string | null;
  price: number;
  status: 'draft' | 'published';
  cover_image_id: number | null;
  created_at: string;
  updated_at: string;
  images?: ProductImage[];
  option_groups?: OptionGroup[];
  category?: Category;
}

export interface Order {
  id: number;
  shop_id: number;
  product_id: number;
  wa_number_id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  qty: number;
  note: string;
  selected_options_json: string;
  wa_message: string;
  status: 'new' | 'contacted' | 'done' | 'canceled';
  created_at: string;
  product?: Product;
  wa_number?: WaNumber;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}
