import { useEffect, useState } from 'react';
import { createDeal, fetchCompanies } from '../api/endpoints';
import type { Company, Deal, DealStage } from '../types';
import { DEAL_STAGES, DEAL_STAGE_LABELS } from '../types';
import DatePicker from './DatePicker';

interface Props {
  defaultCompanyId?: string;
  onClose: () => void;
  onCreated: (d: Deal) => void;
}

export default function CreateDealDialog({ defaultCompanyId, onClose, onCreated }: Props) {
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? '');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [stage, setStage] = useState<DealStage>('lead');
  const [closeDate, setCloseDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCompanies({ status: 'active' }).then((list) => {
      setCompanies(list);
      if (!companyId && list.length > 0) setCompanyId(list[0].id);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !title.trim()) return;
    setBusy(true);
    setError('');
    try {
      const d = await createDeal({
        company_id: companyId,
        title: title.trim(),
        amount: amount ? Number(amount) : null,
        stage,
        expected_close_date: closeDate || null,
        owner_id: null,
        notes: '',
      });
      onCreated(d);
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
        <h2 className="text-lg font-semibold mb-4">새 딜</h2>

        <label className="block text-sm font-medium mb-1">고객사</label>
        <select
          className="w-full border border-slate-300 rounded px-3 py-2 mb-3"
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          required
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium mb-1">제목</label>
        <input
          className="w-full border border-slate-300 rounded px-3 py-2 mb-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">금액 (원)</label>
            <input
              type="number"
              min={0}
              className="w-full border border-slate-300 rounded px-3 py-2"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="선택"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">단계</label>
            <select
              className="w-full border border-slate-300 rounded px-3 py-2"
              value={stage}
              onChange={(e) => setStage(e.target.value as DealStage)}
            >
              {DEAL_STAGES.map((s) => (
                <option key={s} value={s}>
                  {DEAL_STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="block text-sm font-medium mb-1">예상 마감일</label>
        <DatePicker value={closeDate} onChange={setCloseDate} placeholder="마감일 선택" className="mb-4" />

        {error && <p className="text-rose-600 text-sm mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">
            취소
          </button>
          <button
            type="submit"
            disabled={busy || !title.trim() || !companyId}
            className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? '생성 중…' : '생성'}
          </button>
        </div>
      </form>
    </div>
  );
}
