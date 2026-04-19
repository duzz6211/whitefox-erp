import { useState } from 'react';
import { createCompany } from '../api/endpoints';
import type { Company } from '../types';

interface Props {
  onClose: () => void;
  onCreated: (c: Company) => void;
}

export default function CreateCompanyDialog({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const c = await createCompany({
        name: name.trim(),
        domain: domain.trim() || null,
        industry: industry.trim() || null,
        notes: notes.trim(),
      });
      onCreated(c);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? '생성 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg p-5 sm:p-6 w-full max-w-[460px] mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-semibold mb-4">새 고객사</h2>

        <label className="block text-sm font-medium mb-1">회사명</label>
        <input
          className="w-full border border-slate-300 rounded px-3 py-2 mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">도메인</label>
            <input
              className="w-full border border-slate-300 rounded px-3 py-2"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">업종</label>
            <input
              className="w-full border border-slate-300 rounded px-3 py-2"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </div>
        </div>

        <label className="block text-sm font-medium mb-1">메모</label>
        <textarea
          className="w-full border border-slate-300 rounded px-3 py-2 mb-4 h-20 resize-none"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {error && <p className="text-rose-600 text-sm mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">
            취소
          </button>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? '생성 중…' : '생성'}
          </button>
        </div>
      </form>
    </div>
  );
}
