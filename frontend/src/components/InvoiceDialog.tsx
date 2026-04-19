import { useEffect, useState } from 'react';
import {
  createInvoice,
  fetchCompanies,
  fetchDeals,
  updateInvoice,
} from '../api/endpoints';
import type { Company, Deal, Invoice, InvoiceStatus } from '../types';
import { INVOICE_STATUSES, INVOICE_STATUS_LABELS } from '../types';
import DatePicker from './DatePicker';

interface Props {
  invoice?: Invoice;
  defaultCompanyId?: string;
  onClose: () => void;
  onSaved: (inv: Invoice) => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function suggestInvoiceNumber(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${y}${m}-${rand}`;
}

export default function InvoiceDialog({ invoice, defaultCompanyId, onClose, onSaved }: Props) {
  const isEdit = !!invoice;

  const [companyId, setCompanyId] = useState(invoice?.company_id ?? defaultCompanyId ?? '');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dealId, setDealId] = useState(invoice?.deal_id ?? '');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoice_number ?? suggestInvoiceNumber());
  const [title, setTitle] = useState(invoice?.title ?? '');
  const [amount, setAmount] = useState(invoice?.amount?.toString() ?? '');
  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status ?? 'draft');
  const [issuedDate, setIssuedDate] = useState(invoice?.issued_date ?? todayISO());
  const [dueDate, setDueDate] = useState(invoice?.due_date ?? '');
  const [paidDate, setPaidDate] = useState(invoice?.paid_date ?? '');
  const [notes, setNotes] = useState(invoice?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCompanies({ status: 'active' }).then((list) => {
      setCompanies(list);
      if (!companyId && list.length > 0) setCompanyId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!companyId) return;
    fetchDeals({ company_id: companyId }).then(setDeals);
    if (!isEdit) setDealId('');
  }, [companyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !title.trim() || !amount) return;
    setBusy(true);
    setError('');
    try {
      let result: Invoice;
      if (isEdit && invoice) {
        result = await updateInvoice(invoice.id, {
          deal_id: dealId || null,
          invoice_number: invoiceNumber.trim(),
          title: title.trim(),
          amount: Number(amount),
          status,
          issued_date: issuedDate,
          due_date: dueDate || null,
          paid_date: paidDate || null,
          notes: notes.trim(),
        });
      } else {
        result = await createInvoice({
          company_id: companyId,
          deal_id: dealId || null,
          invoice_number: invoiceNumber.trim(),
          title: title.trim(),
          amount: Number(amount),
          issued_date: issuedDate,
          due_date: dueDate || null,
          notes: notes.trim(),
        } as any);
      }
      onSaved(result);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? '저장 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg p-5 sm:p-6 w-full max-w-[520px] mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-semibold mb-4">{isEdit ? '인보이스 편집' : '새 인보이스'}</h2>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">고객사</label>
            <select
              className="w-full border border-slate-300 rounded px-3 py-2"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={isEdit}
              required
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {isEdit && (
              <p className="text-xs text-slate-400 mt-1">고객사는 변경할 수 없습니다</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              연결 딜 <span className="text-slate-400 text-xs">(선택)</span>
            </label>
            <select
              className="w-full border border-slate-300 rounded px-3 py-2"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
            >
              <option value="">없음</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="block text-sm font-medium mb-1">인보이스 번호</label>
        <input
          className="w-full border border-slate-300 rounded px-3 py-2 mb-3 font-mono text-sm"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
          required
        />

        <label className="block text-sm font-medium mb-1">제목</label>
        <input
          className="w-full border border-slate-300 rounded px-3 py-2 mb-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 푸른숲 LMS 1차 선금"
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
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">상태</label>
            <select
              className="w-full border border-slate-300 rounded px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
              disabled={!isEdit}
            >
              {INVOICE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {INVOICE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            {!isEdit && (
              <p className="text-xs text-slate-400 mt-1">생성 시는 초안으로 시작</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">발행일</label>
            <DatePicker value={issuedDate} onChange={setIssuedDate} required placeholder="발행일" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">지급 예정일</label>
            <DatePicker value={dueDate} onChange={setDueDate} placeholder="예정일" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">입금일</label>
            <DatePicker value={paidDate} onChange={setPaidDate} disabled={!isEdit} placeholder="입금일" />
          </div>
        </div>

        <label className="block text-sm font-medium mb-1">메모</label>
        <textarea
          className="w-full border border-slate-300 rounded px-3 py-2 mb-4 h-16 resize-none text-sm"
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
            disabled={busy || !companyId || !title.trim() || !amount}
            className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? '저장 중…' : isEdit ? '저장' : '생성'}
          </button>
        </div>
      </form>
    </div>
  );
}
