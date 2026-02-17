'use client';

import { useLocale } from '@/contexts/LocaleContext';

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="flex gap-1">
      <button
        onClick={() => setLocale('lo')}
        className={`px-2 py-1 rounded text-sm font-medium ${
          locale === 'lo' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        ລາວ
      </button>
      <button
        onClick={() => setLocale('en')}
        className={`px-2 py-1 rounded text-sm font-medium ${
          locale === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        EN
      </button>
    </div>
  );
}
