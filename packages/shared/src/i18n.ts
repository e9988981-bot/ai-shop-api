import type { Locale } from './types';

export type TranslationKey = string;
export type Translations = Record<string, string>;

export const translations: Record<Locale, Translations> = {
  lo: {
    'shop.title': 'ຮ້ານຄ້າ',
    'shop.products': 'ສິນຄ້າ',
    'shop.categories': 'ໝວດໝູ່',
    'shop.search': 'ຄົ້ນຫາ',
    'shop.all_categories': 'ທຸກໝວດໝູ່',
    'product.add_to_cart': 'ສັ່ງຊື້',
    'product.quantity': 'ຈຳນວນ',
    'product.note': 'ໝາຍເຫດ',
    'product.select_options': 'ເລືອກຕົວເລືອກ',
    'product.whatsapp_order': 'ສັ່ງຜ່ານ WhatsApp',
    'form.name': 'ຊື່',
    'form.phone': 'ເບີໂທ',
    'form.address': 'ທີ່ຢູ່',
    'form.required': 'ຕ້ອງການ',
    'form.submit': 'ສົ່ງ',
    'form.cancel': 'ຍົກເລີກ',
    'order.success': 'ສຳເລັດ! ກຳລັງເປີດ WhatsApp...',
    'order.error': 'ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່',
    'admin.login': 'ເຂົ້າສູ່ລະບົບ',
    'admin.logout': 'ອອກຈາກລະບົບ',
    'admin.dashboard': 'ແດັບບອດ',
    'admin.shop': 'ຕັ້ງຄ່າຮ້ານ',
    'admin.products': 'ສິນຄ້າ',
    'admin.orders': 'ຄ່າສັ່ງຊື້',
    'admin.categories': 'ໝວດໝູ່',
    'admin.wa_numbers': 'ເບີ WhatsApp',
    'admin.save': 'ບັນທຶກ',
    'admin.delete': 'ລຶບ',
    'admin.edit': 'ແກ້ໄຂ',
    'admin.add': 'ເພີ່ມ',
    'admin.status': 'ສະຖານະ',
  },
  en: {
    'shop.title': 'Shop',
    'shop.products': 'Products',
    'shop.categories': 'Categories',
    'shop.search': 'Search',
    'shop.all_categories': 'All Categories',
    'product.add_to_cart': 'Order',
    'product.quantity': 'Quantity',
    'product.note': 'Note',
    'product.select_options': 'Select options',
    'product.whatsapp_order': 'Order via WhatsApp',
    'form.name': 'Name',
    'form.phone': 'Phone',
    'form.address': 'Address',
    'form.required': 'Required',
    'form.submit': 'Submit',
    'form.cancel': 'Cancel',
    'order.success': 'Success! Opening WhatsApp...',
    'order.error': 'An error occurred. Please try again.',
    'admin.login': 'Login',
    'admin.logout': 'Logout',
    'admin.dashboard': 'Dashboard',
    'admin.shop': 'Shop Settings',
    'admin.products': 'Products',
    'admin.orders': 'Orders',
    'admin.categories': 'Categories',
    'admin.wa_numbers': 'WhatsApp Numbers',
    'admin.save': 'Save',
    'admin.delete': 'Delete',
    'admin.edit': 'Edit',
    'admin.add': 'Add',
    'admin.status': 'Status',
  },
};

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale]?.[key] ?? key;
}

export function getBilingual(locale: Locale, obj: { lo: string; en: string } | null | undefined): string {
  if (!obj) return '';
  return locale === 'lo' ? obj.lo : obj.en;
}
