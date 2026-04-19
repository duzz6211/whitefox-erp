import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Pencil } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Card, CardHeader, CardBody, Button } from '../components/ui';
import { fetchOrganization, updateOrganization } from '../api/endpoints';
import { getUser } from '../lib/auth';
import type { OrganizationInfo } from '../types';
import DatePicker from '../components/DatePicker';

export default function InfoPage() {
  const navigate = useNavigate();
  const user = getUser();
  const [info, setInfo] = useState<OrganizationInfo | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<OrganizationInfo>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function load() {
    const data = await fetchOrganization();
    setInfo(data);
    setDraft(data);
  }

  useEffect(() => { load(); }, []);

  if (!user) { navigate('/login'); return null; }

  const isAdmin = user.role === 'admin';

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const updated = await updateOrganization(draft);
      setInfo(updated);
      setDraft(updated);
      setEditing(false);
      setMsg({ type: 'ok', text: '저장되었습니다.' });
    } catch (err: any) {
      setMsg({ type: 'err', text: err.response?.data?.detail ?? '저장 실패' });
    } finally {
      setBusy(false);
    }
  }

  if (!info) {
    return <PageLayout title="회사 정보"><div className="text-slate-500">불러오는 중…</div></PageLayout>;
  }

  return (
    <PageLayout title="회사 정보" subtitle="WHITEFOX 사업자 정보·연락처">
      <div className="max-w-4xl">
        <Card className="mb-6">
          <CardBody className="p-8">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 bg-[#0066cc]/10 rounded-2xl flex items-center justify-center shrink-0">
                <Building2 size={40} className="text-[#0066cc]" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold text-slate-900">
                  {info.business_name || '회사명 미설정'}
                </h2>
                {info.representative_name && (
                  <p className="text-sm text-slate-500 mt-1">
                    대표 <span className="text-slate-700 font-medium">{info.representative_name}</span>
                  </p>
                )}
                {info.address && (
                  <p className="text-sm text-slate-600 mt-3">{info.address}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-slate-500 flex-wrap">
                  {info.phone && <span>{info.phone}</span>}
                  {info.email && (
                    <a href={`mailto:${info.email}`} className="text-[#0066cc] hover:underline">
                      {info.email}
                    </a>
                  )}
                  {info.website && (
                    <a href={info.website} target="_blank" rel="noreferrer" className="text-[#0066cc] hover:underline">
                      {info.website}
                    </a>
                  )}
                </div>
              </div>
              {isAdmin && !editing && (
                <Button variant="secondary" onClick={() => setEditing(true)} className="shrink-0">
                  <Pencil size={14} className="inline mr-1" /> 편집
                </Button>
              )}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="사업자 정보" />
          <CardBody>
            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="법인명" value={draft.business_name ?? ''} onChange={(v) => setDraft({ ...draft, business_name: v })} />
                  <Field label="대표자" value={draft.representative_name ?? ''} onChange={(v) => setDraft({ ...draft, representative_name: v })} />
                  <Field label="사업자등록번호" value={draft.business_number ?? ''} onChange={(v) => setDraft({ ...draft, business_number: v })} placeholder="123-45-67890" mono />
                  <Field label="법인등록번호" value={draft.corporate_number ?? ''} onChange={(v) => setDraft({ ...draft, corporate_number: v })} placeholder="110111-1234567" mono />
                  <Field label="업태" value={draft.business_type ?? ''} onChange={(v) => setDraft({ ...draft, business_type: v })} />
                  <Field label="종목" value={draft.business_item ?? ''} onChange={(v) => setDraft({ ...draft, business_item: v })} />
                  <Field label="전화" value={draft.phone ?? ''} onChange={(v) => setDraft({ ...draft, phone: v })} />
                  <Field label="이메일" type="email" value={draft.email ?? ''} onChange={(v) => setDraft({ ...draft, email: v })} />
                  <Field label="웹사이트" value={draft.website ?? ''} onChange={(v) => setDraft({ ...draft, website: v })} placeholder="https://" />
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">설립일</label>
                    <DatePicker value={draft.established_date ?? ''} onChange={(v) => setDraft({ ...draft, established_date: v || null })} placeholder="설립일 선택" />
                  </div>
                </div>
                <Field label="주소" value={draft.address ?? ''} onChange={(v) => setDraft({ ...draft, address: v })} />
                <div>
                  <label className="block text-xs text-slate-500 mb-1">비고 · 메모</label>
                  <textarea
                    value={draft.notes ?? ''}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm h-20 resize-none"
                  />
                </div>
                {msg && (
                  <p className={`text-sm ${msg.type === 'ok' ? 'text-[#28a745]' : 'text-[#dc3545]'}`}>{msg.text}</p>
                )}
                <div className="flex gap-2">
                  <Button type="submit" disabled={busy}>{busy ? '저장 중…' : '저장'}</Button>
                  <Button type="button" variant="ghost" onClick={() => { setEditing(false); setDraft(info); setMsg(null); }}>
                    취소
                  </Button>
                </div>
              </form>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <Row label="법인명" value={info.business_name} />
                <Row label="대표자" value={info.representative_name} />
                <Row label="사업자등록번호" value={info.business_number} mono />
                <Row label="법인등록번호" value={info.corporate_number} mono />
                <Row label="업태" value={info.business_type} />
                <Row label="종목" value={info.business_item} />
                <Row label="전화" value={info.phone} />
                <Row label="이메일" value={info.email} />
                <Row label="웹사이트" value={info.website} />
                <Row label="설립일" value={info.established_date ?? ''} />
                <div className="sm:col-span-2">
                  <Row label="주소" value={info.address} />
                </div>
                {info.notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-slate-500 mb-1">비고</dt>
                    <dd className="text-sm text-slate-800 whitespace-pre-wrap">{info.notes}</dd>
                  </div>
                )}
              </dl>
            )}
          </CardBody>
        </Card>

        {!editing && (
          <p className="text-xs text-slate-400 mt-4 text-right">
            최종 업데이트 {new Date(info.updated_at).toLocaleString('ko-KR')}
          </p>
        )}
      </div>
    </PageLayout>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 mb-1">{label}</dt>
      <dd className={`text-sm text-slate-800 ${mono ? 'font-mono' : ''}`}>
        {value || <span className="text-slate-400 italic">미입력</span>}
      </dd>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', placeholder, mono,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border border-slate-300 rounded px-3 py-2 text-sm ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}
