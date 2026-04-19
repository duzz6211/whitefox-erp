import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import CrmSubNav from '../components/CrmSubNav';
import InvoiceDialog from '../components/InvoiceDialog';
import { Card, CardBody, CardHeader, Avatar, Button, StatusPill } from '../components/ui';
import {
  createContact,
  deleteContact,
  deleteInvoice,
  fetchCompany,
  fetchCompanyInvoices,
  fetchContacts,
  fetchDeals,
  fetchProjects,
  updateCompany,
  updateInvoice,
} from '../api/endpoints';
import { getUser } from '../lib/auth';
import { useUserDirectory } from '../lib/users';
import type { Company, Contact, Deal, Invoice, InvoiceStatus, Project } from '../types';
import { DEAL_STAGE_LABELS, INVOICE_STATUSES, INVOICE_STATUS_LABELS } from '../types';

const INV_TONE: Record<InvoiceStatus, 'pending' | 'info' | 'success' | 'danger' | 'neutral'> = {
  draft: 'neutral', sent: 'info', paid: 'success', overdue: 'danger', void: 'neutral',
};

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = getUser();
  const { nameOf } = useUserDirectory();
  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const isAdmin = user?.role === 'admin';

  async function load() {
    if (!id) return;
    const [c, ctcs, dls, prjs, invs] = await Promise.all([
      fetchCompany(id), fetchContacts(id), fetchDeals({ company_id: id }),
      fetchProjects(), fetchCompanyInvoices(id),
    ]);
    setCompany(c);
    setContacts(ctcs);
    setDeals(dls);
    setProjects(prjs.filter((p) => p.company_id === id));
    setInvoices(invs);
    setNotesDraft(c.notes);
  }

  async function handleInvoiceStatusChange(inv: Invoice, next: InvoiceStatus) {
    await updateInvoice(inv.id, { status: next });
    if (id) setInvoices(await fetchCompanyInvoices(id));
  }
  async function handleInvoiceDelete(inv: Invoice) {
    if (!confirm(`"${inv.invoice_number}" 인보이스를 삭제할까요?`)) return;
    await deleteInvoice(inv.id);
    if (id) setInvoices(await fetchCompanyInvoices(id));
  }

  useEffect(() => { load(); }, [id]);

  if (!user) { navigate('/login'); return null; }

  async function handleSaveNotes() {
    if (!id) return;
    const updated = await updateCompany(id, { notes: notesDraft });
    setCompany(updated);
    setEditingNotes(false);
  }
  async function handleDeleteContact(cid: string) {
    if (!confirm('담당자를 삭제할까요?')) return;
    await deleteContact(cid);
    setContacts(await fetchContacts(id!));
  }

  if (!company) {
    return <PageLayout title="CRM"><div className="text-slate-500">불러오는 중…</div></PageLayout>;
  }

  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const totalOutstanding = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.amount, 0);

  return (
    <PageLayout title={company.name} subtitle={[company.industry, company.domain].filter(Boolean).join(' · ') || '—'}>
      <CrmSubNav />

      <Link to="/crm" className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-block">
        ← 고객사 목록
      </Link>

      {/* 요약 정보 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader title="기본 정보" />
          <CardBody>
            <div className="flex items-center gap-3 mb-4">
              <Avatar name={company.name} size={56} />
              <div className="min-w-0">
                <div className="font-semibold text-slate-900">{company.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {company.status === 'active' && <StatusPill tone="active">Active</StatusPill>}
                  {company.status === 'lost' && <StatusPill tone="danger">이탈</StatusPill>}
                  {company.status === 'archived' && <StatusPill tone="neutral">아카이브</StatusPill>}
                </div>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              <Row label="업종" value={company.industry || '—'} />
              <Row label="도메인" value={company.domain || '—'} />
              <Row label="등록일" value={new Date(company.created_at).toLocaleDateString('ko-KR')} />
            </dl>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="수금 현황"
            action={<Link to="/crm/invoices" className="text-sm text-[#0066cc] hover:underline">전체 인보이스 →</Link>}
          />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-[#28a745]/10 rounded p-4">
                <div className="text-xs text-slate-600 mb-1">입금 완료 누계</div>
                <div className="text-2xl font-bold text-[#1b5e20]">₩{totalPaid.toLocaleString()}</div>
              </div>
              <div className="bg-[#ffc107]/15 rounded p-4">
                <div className="text-xs text-slate-600 mb-1">미수금 (발송·연체)</div>
                <div className="text-2xl font-bold text-[#8a6100]">₩{totalOutstanding.toLocaleString()}</div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 메모 */}
      <Card className="mb-6">
        <CardHeader
          title="메모"
          action={isAdmin && !editingNotes && (
            <button onClick={() => setEditingNotes(true)} className="text-sm text-[#0066cc] hover:underline">편집</button>
          )}
        />
        <CardBody>
          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm h-32 resize-none"
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveNotes}>저장</Button>
                <Button variant="ghost" onClick={() => { setEditingNotes(false); setNotesDraft(company.notes); }}>취소</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-800 whitespace-pre-wrap">
              {company.notes.trim() || <span className="text-slate-400 italic">비어있음</span>}
            </p>
          )}
        </CardBody>
      </Card>

      {/* 담당자 */}
      <Card className="mb-6">
        <CardHeader
          title={`담당자 (${contacts.length})`}
          action={isAdmin && (
            <button onClick={() => setShowContactForm(!showContactForm)} className="text-sm text-[#0066cc] hover:underline">
              {showContactForm ? '취소' : '+ 추가'}
            </button>
          )}
        />
        <CardBody>
          {showContactForm && (
            <ContactForm
              companyId={company.id}
              onDone={() => { setShowContactForm(false); fetchContacts(company.id).then(setContacts); }}
            />
          )}
          {contacts.length === 0 ? (
            <p className="text-sm text-slate-400">등록된 담당자가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {contacts.map((c) => (
                <li key={c.id} className="py-3 flex items-center gap-3">
                  <Avatar name={c.name} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900">
                      {c.name}
                      {c.title && <span className="text-slate-500 text-sm ml-2">· {c.title}</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {[c.email, c.phone].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDeleteContact(c.id)} className="text-xs text-[#dc3545] hover:underline">삭제</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* 인보이스 */}
      <Card className="mb-6">
        <CardHeader
          title={`인보이스 (${invoices.length})`}
          action={isAdmin && (
            <button onClick={() => setCreatingInvoice(true)} className="text-sm text-[#0066cc] hover:underline">+ 추가</button>
          )}
        />
        <CardBody>
          {invoices.length === 0 ? (
            <p className="text-sm text-slate-400">인보이스 없음</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <li key={inv.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusPill tone={INV_TONE[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</StatusPill>
                      <span className="font-mono text-xs text-slate-500">{inv.invoice_number}</span>
                      <span className="font-medium text-slate-900">{inv.title}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      ₩{inv.amount.toLocaleString()} · 발행 {inv.issued_date}
                      {inv.due_date && ` · 지급예정 ${inv.due_date}`}
                      {inv.paid_date && <span className="text-[#28a745]"> · 입금 {inv.paid_date}</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2 text-xs">
                      <select
                        value={inv.status}
                        onChange={(e) => handleInvoiceStatusChange(inv, e.target.value as InvoiceStatus)}
                        className="border border-slate-300 rounded px-1.5 py-0.5 bg-white"
                      >
                        {INVOICE_STATUSES.map((s) => (
                          <option key={s} value={s}>{INVOICE_STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                      <button onClick={() => setEditingInvoice(inv)} className="text-[#0066cc] hover:underline">편집</button>
                      <button onClick={() => handleInvoiceDelete(inv)} className="text-[#dc3545] hover:underline">삭제</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card>
          <CardHeader title={`딜 (${deals.length})`} />
          <CardBody>
            {deals.length === 0 ? (
              <p className="text-sm text-slate-400">딜 없음</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {deals.map((d) => (
                  <li key={d.id} className="py-2">
                    <div className="font-medium text-slate-900">{d.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {DEAL_STAGE_LABELS[d.stage]} · ₩{(d.amount ?? 0).toLocaleString()} · {nameOf(d.owner_id)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`연결된 프로젝트 (${projects.length})`} />
          <CardBody>
            {projects.length === 0 ? (
              <p className="text-sm text-slate-400">연결된 프로젝트 없음</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {projects.map((p) => (
                  <li key={p.id} className="py-2">
                    <Link to={`/projects/${p.id}`} className="text-[#0066cc] hover:underline">{p.name}</Link>
                    <span className="text-xs text-slate-500 ml-2">· {p.category}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {creatingInvoice && (
        <InvoiceDialog
          defaultCompanyId={company.id}
          onClose={() => setCreatingInvoice(false)}
          onSaved={() => { setCreatingInvoice(false); load(); }}
        />
      )}
      {editingInvoice && (
        <InvoiceDialog
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
          onSaved={() => { setEditingInvoice(null); load(); }}
        />
      )}
    </PageLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800 font-medium">{value}</dd>
    </div>
  );
}

function ContactForm({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createContact(companyId, {
        name: name.trim(),
        title: title.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: '',
      });
      onDone();
    } catch (err: any) {
      alert(err.response?.data?.detail ?? '추가 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded p-3 mb-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 *" required
          className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="직책"
          className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일"
          className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="전화"
          className="border border-slate-300 rounded px-2 py-1.5 text-sm" />
      </div>
      <Button type="submit" disabled={busy || !name.trim()}>{busy ? '추가 중…' : '추가'}</Button>
    </form>
  );
}
