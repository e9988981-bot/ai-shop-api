'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<{ id: number; name_lo: string; name_en: string }[]>([]);
  const [form, setForm] = useState({ name_lo: '', name_en: '' });
  const [editing, setEditing] = useState<number | null>(null);

  useEffect(() => {
    apiGet<{ id: number; name_lo: string; name_en: string }[]>('/api/admin/categories').then((res) => {
      if (res.ok && Array.isArray(res.data)) setItems(res.data);
    });
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiPost('/api/admin/categories', form);
    if (res.ok && res.data) {
      setItems((prev) => [...prev, res.data as { id: number; name_lo: string; name_en: string }]);
      setForm({ name_lo: '', name_en: '' });
    }
  };

  const handleUpdate = async (id: number, name_lo: string, name_en: string) => {
    await apiPut(`/api/admin/categories/${id}`, { name_lo, name_en });
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, name_lo, name_en } : c)));
    setEditing(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete?')) return;
    await apiDelete(`/api/admin/categories/${id}`);
    setItems((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Categories</h1>
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          value={form.name_lo}
          onChange={(e) => setForm((f) => ({ ...f, name_lo: e.target.value }))}
          placeholder="Name (Lao)"
          className="px-3 py-2 border rounded-lg"
          required
        />
        <input
          value={form.name_en}
          onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
          placeholder="Name (English)"
          className="px-3 py-2 border rounded-lg"
          required
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          Add
        </button>
      </form>
      <div className="space-y-2">
        {items.map((c) => (
          <div key={c.id} className="flex items-center gap-2 p-2 bg-white rounded border">
            {editing === c.id ? (
              <>
                <input
                  defaultValue={c.name_lo}
                  id={`lo-${c.id}`}
                  className="px-2 py-1 border rounded flex-1"
                />
                <input
                  defaultValue={c.name_en}
                  id={`en-${c.id}`}
                  className="px-2 py-1 border rounded flex-1"
                />
                <button
                  onClick={() =>
                    handleUpdate(
                      c.id,
                      (document.getElementById(`lo-${c.id}`) as HTMLInputElement)?.value || '',
                      (document.getElementById(`en-${c.id}`) as HTMLInputElement)?.value || ''
                    )
                  }
                  className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Save
                </button>
                <button onClick={() => setEditing(null)} className="px-2 py-1 border rounded text-sm">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span className="flex-1">{c.name_lo} / {c.name_en}</span>
                <button onClick={() => setEditing(c.id)} className="text-blue-600 text-sm">Edit</button>
                <button onClick={() => handleDelete(c.id)} className="text-red-600 text-sm">Delete</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
