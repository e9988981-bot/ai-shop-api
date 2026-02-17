import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const orderPublicSchema = z.object({
  product_id: z.number().int().positive(),
  wa_number_id: z.number().int().positive(),
  customer_name: z.string().min(1).max(200),
  customer_phone: z.string().min(1).max(50),
  customer_address: z.string().max(500).optional().default(''),
  qty: z.number().int().positive().max(999),
  note: z.string().max(1000).optional().default(''),
  selected_options: z.record(z.string(), z.string()).optional().default({}),
});

export const shopUpdateSchema = z.object({
  name_lo: z.string().min(1).max(200).optional(),
  name_en: z.string().min(1).max(200).optional(),
  desc_lo: z.string().max(2000).optional().nullable(),
  desc_en: z.string().max(2000).optional().nullable(),
  avatar_key: z.string().max(500).optional().nullable(),
  cover_key: z.string().max(500).optional().nullable(),
  theme_primary: z.string().max(20).optional(),
  theme_secondary: z.string().max(20).optional(),
  wa_template: z.string().max(2000).optional().nullable(),
});

export const waNumberSchema = z.object({
  label: z.string().min(1).max(100),
  phone_e164: z.string().min(1).max(20),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export const categorySchema = z.object({
  name_lo: z.string().min(1).max(200),
  name_en: z.string().min(1).max(200),
  sort_order: z.number().int().min(0).optional(),
});

export const productSchema = z.object({
  category_id: z.number().int().positive().nullable().optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  name_lo: z.string().min(1).max(200),
  name_en: z.string().min(1).max(200),
  desc_lo: z.string().max(5000).optional().nullable(),
  desc_en: z.string().max(5000).optional().nullable(),
  price: z.number().min(0),
  status: z.enum(['draft', 'published']).optional(),
});

export const productImageAttachSchema = z.object({
  r2_key: z.string().min(1).max(500),
});

export const productImagesReorderSchema = z.object({
  image_ids: z.array(z.number().int().positive()),
});

export const optionGroupSchema = z.object({
  name_lo: z.string().min(1).max(100),
  name_en: z.string().min(1).max(100),
  is_required: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export const optionValueSchema = z.object({
  value_lo: z.string().min(1).max(100),
  value_en: z.string().min(1).max(100),
  sort_order: z.number().int().min(0).optional(),
});

export const orderStatusSchema = z.enum(['new', 'contacted', 'done', 'canceled']);

export const orderUpdateSchema = z.object({
  status: orderStatusSchema,
});

export const bootstrapSchema = z.object({
  domain: z.string().min(1).max(255),
  shop_name_lo: z.string().min(1).max(200),
  shop_name_en: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8),
});
