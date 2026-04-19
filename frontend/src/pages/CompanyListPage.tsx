import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import CrmSubNav from '../components/CrmSubNav';
import CreateCompanyDialog from '../components/CreateCompanyDialog';
import { Card, CardBody, Button, StatusPill, Avatar } from '../components/ui';
import { fetchCompanies } from '../api/endpoints';
import { getUser } from '../lib/auth';
import type { Company } from '../types';

export default function CompanyListPage() {
  const navigate = useNavigate();
  const user = getUser();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setCompanies(await fetchCompanies(q ? { q } : undefined));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (!user) { navigate('/login'); return null; }

  const isAdmin = user.role === 'admin';

  return (
    <PageLayout title="CRM — 고객사" subtitle="거래처 정보·담당자·딜·인보이스 관리">
      <CrmSubNav />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[300px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="고객사명으로 검색…"
            className="w-full border border-slate-200 rounded pl-10 pr-3 py-2 text-sm bg-white shadow-card"
          />
        </div>
        {isAdmin && <Button onClick={() => setCreating(true)}>+ 새 고객사</Button>}
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <span className="font-semibold">고객사 목록 ({companies.length})</span>
        </div>
        {loading ? (
          <CardBody><div className="text-slate-500">불러오는 중…</div></CardBody>
        ) : companies.length === 0 ? (
          <CardBody><div className="text-center py-6 text-slate-500 text-sm">등록된 고객사가 없습니다.</div></CardBody>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-5 py-3 text-left">고객사</th>
                <th className="px-5 py-3 text-left">업종</th>
                <th className="px-5 py-3 text-left">도메인</th>
                <th className="px-5 py-3 text-center">상태</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition cursor-pointer">
                  <td className="px-5 py-3">
                    <Link to={`/crm/companies/${c.id}`} className="flex items-center gap-3 hover:text-[#0066cc]">
                      <Avatar name={c.name} size={36} />
                      <span className="font-medium text-slate-900">{c.name}</span>
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{c.industry || '—'}</td>
                  <td className="px-5 py-3 text-slate-600 text-xs">{c.domain || '—'}</td>
                  <td className="px-5 py-3 text-center">
                    {c.status === 'active' && <StatusPill tone="active">Active</StatusPill>}
                    {c.status === 'lost' && <StatusPill tone="danger">이탈</StatusPill>}
                    {c.status === 'archived' && <StatusPill tone="neutral">아카이브</StatusPill>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link to={`/crm/companies/${c.id}`} className="text-[#0066cc] text-sm hover:underline">
                      상세 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      {creating && (
        <CreateCompanyDialog
          onClose={() => setCreating(false)}
          onCreated={(c) => {
            setCreating(false);
            navigate(`/crm/companies/${c.id}`);
          }}
        />
      )}
    </PageLayout>
  );
}
