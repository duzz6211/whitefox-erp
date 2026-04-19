import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { Card, Button, StatCard, StatusPill } from '../components/ui';
import {
  fetchBillings, createBilling, updateBilling, deleteBilling,
  fetchPayments, addPayment, deletePayment, fetchMonthlySummary,
} from '../api/endpoints';
import { getUser } from '../lib/auth';
import type { Billing, BillingPayment, BillingCategory, BillingCycle, MonthlySummary } from '../types';
import { BILLING_CATEGORY_LABELS, BILLING_CYCLE_LABELS } from '../types';
import { CreditCard, Plus, Trash2, ChevronDown, ChevronUp, Receipt } from 'lucide-react';
import DatePicker from '../components/DatePicker';

const CATEGORY_TONE: Record<BillingCategory, 'info' | 'success' | 'pending' | 'danger' | 'neutral'> = {
  subscription: 'info',
  infra: 'danger',
  tool: 'pending',
  service: 'success',
  other: 'neutral',
};

export default function BillingPage() {
  const navigate = useNavigate();
  const user = getUser();
  const [billings, setBillings] = useState<Billing[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Billing | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [addingPayment, setAddingPayment] = useState(false);

  async function load() {
    setLoading(true);
    const [bills, summary] = await Promise.all([
      fetchBillings(!showInactive),
      fetchMonthlySummary(),
    ]);
    setBillings(bills);
    setMonthlySummary(summary);
    setLoading(false);
  }

  useEffect(() => { load(); }, [showInactive]);

  if (!user) { navigate('/login'); return null; }
  if (user.role !== 'admin') { navigate('/dashboard'); return null; }

  const totals = useMemo(() => {
    const active = billings.filter((b) => b.is_active);
    const monthly = active.filter((b) => b.cycle === 'monthly').reduce((a, b) => a + b.amount, 0);
    const yearly = active.filter((b) => b.cycle === 'yearly').reduce((a, b) => a + b.amount, 0);
    const oneTime = active.filter((b) => b.cycle === 'one_time').reduce((a, b) => a + b.amount, 0);
    return { monthly, yearly, oneTime, count: active.length };
  }, [billings]);

  async function handleExpand(billingId: string) {
    if (expandedId === billingId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(billingId);
    const p = await fetchPayments(billingId);
    setPayments(p);
  }

  async function handleDelete(b: Billing) {
    if (!confirm(`"${b.name}" 결제 항목을 삭제할까요?`)) return;
    await deleteBilling(b.id);
    await load();
  }

  async function handleToggleActive(b: Billing) {
    await updateBilling(b.id, { is_active: !b.is_active });
    await load();
  }

  async function handleDeletePayment(billingId: string, paymentId: string) {
    if (!confirm('이 결제 기록을 삭제할까요?')) return;
    await deletePayment(billingId, paymentId);
    const p = await fetchPayments(billingId);
    setPayments(p);
  }

  return (
    <PageLayout title="결제 관리" subtitle="내부 결제 항목 및 지출 내역">

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard title="월간 고정비" value={`₩${totals.monthly.toLocaleString()}`} />
        <StatCard title="연간 고정비" value={`₩${totals.yearly.toLocaleString()}`} />
        <StatCard title="1회성 지출" value={`₩${totals.oneTime.toLocaleString()}`} />
        <StatCard title="활성 항목" value={`${totals.count}건`} />
      </div>

      {monthlySummary.length > 0 && (
        <Card className="mb-6">
          <div className="px-5 py-4 border-b border-slate-200 font-semibold flex items-center gap-2">
            <Receipt size={16} /> 월별 결제 요약
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-5 py-3 text-left">월</th>
                  <th className="px-5 py-3 text-right">총액</th>
                  <th className="px-5 py-3 text-right">건수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlySummary.map((s) => (
                  <tr key={s.month} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs">{s.month}</td>
                    <td className="px-5 py-3 text-right font-semibold">₩{s.total.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-slate-500">{s.count}건</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded"
          />
          비활성 항목 포함
        </label>
        <Button onClick={() => { setEditing(null); setCreating(true); }}>
          <Plus size={14} className="inline -mt-0.5" /> 결제 항목 추가
        </Button>
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-slate-200 font-semibold flex items-center gap-2">
          <CreditCard size={16} /> 결제 항목 ({billings.length})
        </div>
        {loading ? (
          <div className="p-6 text-slate-500">불러오는 중…</div>
        ) : billings.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">결제 항목이 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {billings.map((b) => (
              <div key={b.id}>
                <div
                  className={`px-5 py-4 flex items-center gap-4 hover:bg-slate-50 cursor-pointer ${!b.is_active ? 'opacity-50' : ''}`}
                  onClick={() => handleExpand(b.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{b.name}</span>
                      <StatusPill tone={CATEGORY_TONE[b.category]}>{BILLING_CATEGORY_LABELS[b.category]}</StatusPill>
                      {!b.is_active && <StatusPill tone="neutral">비활성</StatusPill>}
                    </div>
                    <div className="text-xs text-slate-500 flex gap-3">
                      {b.vendor && <span>{b.vendor}</span>}
                      <span>{BILLING_CYCLE_LABELS[b.cycle]}</span>
                      <span>결제일: {b.billing_date}</span>
                      {b.next_billing_date && <span>다음: {b.next_billing_date}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold">₩{b.amount.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">/{b.cycle === 'yearly' ? '년' : b.cycle === 'monthly' ? '월' : '회'}</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditing(b); setCreating(true); }}
                      className="text-xs text-[#0066cc] hover:underline"
                    >
                      편집
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleActive(b); }}
                      className="text-xs text-slate-500 hover:underline"
                    >
                      {b.is_active ? '비활성화' : '활성화'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(b); }}
                      className="text-[#dc3545] hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                    {expandedId === b.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {expandedId === b.id && (
                  <div className="px-5 pb-4 bg-slate-50 border-t border-slate-100">
                    {b.notes && <p className="text-sm text-slate-600 mb-3 mt-3">{b.notes}</p>}
                    <div className="flex items-center justify-between mb-2 mt-2">
                      <h4 className="text-sm font-semibold text-slate-700">결제 기록</h4>
                      <button
                        onClick={() => setAddingPayment(true)}
                        className="text-xs text-[#0066cc] hover:underline"
                      >
                        + 결제 기록 추가
                      </button>
                    </div>
                    {addingPayment && (
                      <PaymentForm
                        billingId={b.id}
                        onSaved={async () => {
                          setAddingPayment(false);
                          setPayments(await fetchPayments(b.id));
                        }}
                        onCancel={() => setAddingPayment(false)}
                      />
                    )}
                    {payments.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">기록이 없습니다.</p>
                    ) : (
                      <table className="w-full text-sm mt-2">
                        <thead className="text-xs text-slate-500">
                          <tr>
                            <th className="text-left py-1">결제일</th>
                            <th className="text-right py-1">금액</th>
                            <th className="text-left py-1">메모</th>
                            <th className="text-right py-1"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {payments.map((p) => (
                            <tr key={p.id}>
                              <td className="py-2 text-xs font-mono">{p.paid_date}</td>
                              <td className="py-2 text-right font-semibold">₩{p.amount.toLocaleString()}</td>
                              <td className="py-2 text-xs text-slate-500">{p.notes || '—'}</td>
                              <td className="py-2 text-right">
                                <button
                                  onClick={() => handleDeletePayment(b.id, p.id)}
                                  className="text-[#dc3545] hover:text-red-700"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {creating && (
        <BillingDialog
          billing={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); load(); }}
        />
      )}
    </PageLayout>
  );
}

// ── 결제 기록 추가 폼 ──

function PaymentForm({ billingId, onSaved, onCancel }: {
  billingId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !paidDate) return;
    setSaving(true);
    await addPayment(billingId, { amount: Number(amount), paid_date: paidDate, notes });
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end mb-3 flex-wrap">
      <label className="text-xs">
        금액
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min={0}
          className="block w-32 border border-slate-300 rounded px-2 py-1 text-sm mt-0.5" />
      </label>
      <div className="text-xs">
        <span className="block mb-0.5">결제일</span>
        <DatePicker value={paidDate} onChange={setPaidDate} required compact className="w-[160px]" />
      </div>
      <label className="text-xs flex-1 min-w-[120px]">
        메모
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500}
          className="block w-full border border-slate-300 rounded px-2 py-1 text-sm mt-0.5" />
      </label>
      <Button type="submit" disabled={saving}>{saving ? '저장 중…' : '저장'}</Button>
      <button type="button" onClick={onCancel} className="text-xs text-slate-500 hover:underline pb-1">취소</button>
    </form>
  );
}

// ── 결제 항목 생성/수정 다이얼로그 ──

const CATEGORIES: BillingCategory[] = ['subscription', 'infra', 'tool', 'service', 'other'];
const CYCLES: BillingCycle[] = ['monthly', 'yearly', 'one_time'];

function BillingDialog({ billing, onClose, onSaved }: {
  billing: Billing | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!billing;
  const [name, setName] = useState(billing?.name ?? '');
  const [category, setCategory] = useState<BillingCategory>(billing?.category ?? 'other');
  const [amount, setAmount] = useState(billing?.amount?.toString() ?? '');
  const [cycle, setCycle] = useState<BillingCycle>(billing?.cycle ?? 'monthly');
  const [billingDate, setBillingDate] = useState(billing?.billing_date ?? new Date().toISOString().split('T')[0]);
  const [nextBillingDate, setNextBillingDate] = useState(billing?.next_billing_date ?? '');
  const [vendor, setVendor] = useState(billing?.vendor ?? '');
  const [notes, setNotes] = useState(billing?.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name,
      category,
      amount: Number(amount),
      cycle,
      billing_date: billingDate,
      next_billing_date: nextBillingDate || null,
      vendor,
      notes,
    };
    if (isEdit) {
      await updateBilling(billing!.id, payload);
    } else {
      await createBilling(payload);
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 font-semibold">
          {isEdit ? '결제 항목 수정' : '새 결제 항목'}
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            항목명 *
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={200}
              className="mt-1 block w-full border border-slate-300 rounded-md px-3 py-2 text-sm" placeholder="예: Vercel Pro, AWS EC2" />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-slate-700">
              카테고리
              <select value={category} onChange={(e) => setCategory(e.target.value as BillingCategory)}
                className="mt-1 block w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                {CATEGORIES.map((c) => <option key={c} value={c}>{BILLING_CATEGORY_LABELS[c]}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              결제 주기
              <select value={cycle} onChange={(e) => setCycle(e.target.value as BillingCycle)}
                className="mt-1 block w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                {CYCLES.map((c) => <option key={c} value={c}>{BILLING_CYCLE_LABELS[c]}</option>)}
              </select>
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            금액 (원) *
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min={0}
              className="mt-1 block w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            공급사/벤더
            <input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} maxLength={200}
              className="mt-1 block w-full border border-slate-300 rounded-md px-3 py-2 text-sm" placeholder="예: Amazon, Google, Vercel" />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">결제일 *</label>
              <DatePicker value={billingDate} onChange={setBillingDate} required placeholder="결제일 선택" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">다음 결제일</label>
              <DatePicker value={nextBillingDate} onChange={setNextBillingDate} placeholder="다음 결제일" />
            </div>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            메모
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={5000}
              className="mt-1 block w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">취소</button>
            <Button type="submit" disabled={saving}>{saving ? '저장 중…' : isEdit ? '수정' : '추가'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
