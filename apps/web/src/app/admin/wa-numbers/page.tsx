'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

export default function AdminWaNumbersPage() {
  const [items, setItems] = useState<{ id: number; label: string; phone_e164: string; is_default: boolean; is_active: boolean }[]>([]);
  const [form, setForm] = useState({ label: '', phone_e164: '', is_default: false });
  const [editing, setEditing] = useState<number | null>(null);

  useEffect(() => {
    apiGet<typeof items>('/api/admin/wa-numbers').then((res) => {
      if (res.ok && Array.isArray(res.data)) setItems(res.data);
    });
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiPost('/api/admin/wa-numbers', form);
    if (res.ok && res.data) {
      setItems((prev) => [...prev, res.data as typeof items[0]]);
      setForm({ label: '', phone_e164: '', is_default: false });
    }
  };

  const handleUpdate = async (id: number, updates: Partial<{ label: string; phone_e164: string; is_default: boolean; is_active: boolean }>) => {
    await apiPut(`/api/admin/wa-numbers/${id}`, updates);
    setItems((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
    setEditing(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete?')) return;
    await apiDelete(`/api/admin/wa-numbers/${id}`);
    setItems((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">WhatsApp Numbers</h1>
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-6">
        <input
          value={form.label}
          onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
          placeholder="Label"
          className="px-3 py-2 border rounded-lg"
          required
        />
        <input
          value={form.phone_e164}
          onChange={(e) => setForm((f) => ({ ...f, phone_e164: e.target.value }))}
          placeholder="+8562012345678"
          className="px-3 py-2 border rounded-lg"
          required
        />
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
          />
          Default
        </label>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          Add
        </button>
      </form>
      <div className="space-y-2">
        {items.map((w) => (
          <div key={w.id} className="flex items-center gap-2 p-2 bg-white rounded border">
            <span className="flex-1">{w.label} - {w.phone_e164}</span>
            {w.is_default && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Default</span>}
            {!w.is_active && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Inactive</span>}
            <button
              onClick={() => handleUpdate(w.id, { is_active: !w.is_active })}
              className="text-sm text-blue-600"
            >
              {w.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={() => handleDelete(w.id)} className="text-sm text-red-600">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
