import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import CrmSubNav from '../components/CrmSubNav';
import InvoiceDialog from '../components/InvoiceDialog';
import { Card, Button, StatCard, StatusPill } from '../components/ui';
import { deleteInvoice, fetchCompanies, fetchInvoices, updateInvoice } from '../api/endpoints';
import { getUser } from '../lib/auth';
import type { Company, Invoice, InvoiceStatus } from '../types';
import { INVOICE_STATUSES, INVOICE_STATUS_LABELS } from '../types';

const PILL_TONE: Record<InvoiceStatus, 'pending' | 'info' | 'success' | 'danger' | 'neutral'> = {
  draft: 'neutral',
  sent: 'info',
  paid: 'success',
  overdue: 'danger',
  void: 'neutral',
};

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const user = getUser();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companyMap, setCompanyMap] = useState<Map<string, Company>>(new Map());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');

  async function load() {
    setLoading(true);
    const [invs, cos] = await Promise.all([fetchInvoices(), fetchCompanies()]);
    setInvoices(invs);
    setCompanyMap(new Map(cos.map((c) => [c.id, c])));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (!user) { navigate('/login'); return null; }

  const isAdmin = user.role === 'admin';

  const totals = useMemo(() => {
    const sum = (s: InvoiceStatus) =>
      invoices.filter((i) => i.status === s).reduce((a, i) => a + i.amount, 0);
    return { paid: sum('paid'), sent: sum('sent'), overdue: sum('overdue'), draft: sum('draft') };
  }, [invoices]);

  const visible = statusFilter === 'all'
    ? invoices
    : invoices.filter((i) => i.status === statusFilter);

  async function handleStatusChange(inv: Invoice, next: InvoiceStatus) {
    await updateInvoice(inv.id, { status: next });
    await load();
  }
  async function handleDelete(inv: Invoice) {
    if (!confirm(`"${inv.invoice_number} · ${inv.title}" 인보이스를 삭제할까요?`)) return;
    await deleteInvoice(inv.id);
    await load();
  }

  return (
    <PageLayout title="CRM — 인보이스" subtitle="발행·수금 현황과 상태 관리">
      <CrmSubNav />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard title="입금 완료" value={`₩${totals.paid.toLocaleString()}`} changeType="positive" />
        <StatCard title="발송·대기중" value={`₩${totals.sent.toLocaleString()}`} />
        <StatCard title="연체" value={`₩${totals.overdue.toLocaleString()}`} changeType="negative" />
        <StatCard title="초안" value={`₩${totals.draft.toLocaleString()}`} />
      </div>

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-1 text-xs bg-white rounded shadow-card p-1">
          <FilterBtn active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>전체</FilterBtn>
          {INVOICE_STATUSES.map((s) => (
            <FilterBtn key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {INVOICE_STATUS_LABELS[s]}
            </FilterBtn>
          ))}
        </div>
        {isAdmin && <Button onClick={() => setCreating(true)}>+ 새 인보이스</Button>}
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-slate-200 font-semibold">
          인보이스 목록 ({visible.length})
        </div>
        {loading ? (
          <div className="p-6 text-slate-500">불러오는 중…</div>
        ) : visible.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">인보이스가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-5 py-3 text-left">번호</th>
                <th className="px-5 py-3 text-left">고객사</th>
                <th className="px-5 py-3 text-left">제목</th>
                <th className="px-5 py-3 text-right">금액</th>
                <th className="px-5 py-3 text-center">상태</th>
                <th className="px-5 py-3 text-left">발행/지급</th>
                {isAdmin && <th className="px-5 py-3 text-right">작업</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((inv) => {
                const company = companyMap.get(inv.company_id);
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition cursor-pointer">
                    <td className="px-5 py-3 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="px-5 py-3">
                      {company ? (
                        <Link to={`/crm/companies/${company.id}`} className="text-[#0066cc] hover:underline">
                          {company.name}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3">{inv.title}</td>
                    <td className="px-5 py-3 text-right font-semibold">₩{inv.amount.toLocaleString()}</td>
                    <td className="px-5 py-3 text-center">
                      <StatusPill tone={PILL_TONE[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</StatusPill>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {inv.issued_date}
                      {inv.due_date && ` ~ ${inv.due_date}`}
                      {inv.paid_date && <span className="text-[#28a745]"> · 입금 {inv.paid_date}</span>}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-2 text-xs">
                          <select
                            value={inv.status}
                            onChange={(e) => handleStatusChange(inv, e.target.value as InvoiceStatus)}
                            className="border border-slate-300 rounded px-1.5 py-0.5 bg-white"
                          >
                            {INVOICE_STATUSES.map((s) => (
                              <option key={s} value={s}>{INVOICE_STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                          <button onClick={() => setEditing(inv)} className="text-[#0066cc] hover:underline">편집</button>
                          <button onClick={() => handleDelete(inv)} className="text-[#dc3545] hover:underline">삭제</button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      {creating && (
        <InvoiceDialog onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />
      )}
      {editing && (
        <InvoiceDialog invoice={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </PageLayout>
  );
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded ${active ? 'bg-[#0066cc] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      {children}
    </button>
  );
}
