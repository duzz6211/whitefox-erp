import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import CrmSubNav from '../components/CrmSubNav';
import CreateDealDialog from '../components/CreateDealDialog';
import { Button, StatCard } from '../components/ui';
import { createProjectFromDeal, fetchCompanies, fetchDeals, updateDeal } from '../api/endpoints';
import { getUser } from '../lib/auth';
import { useUserDirectory } from '../lib/users';
import type { Company, Deal, DealStage } from '../types';
import { DEAL_STAGES, DEAL_STAGE_LABELS } from '../types';

const STAGE_ACCENT: Record<DealStage, string> = {
  lead: 'border-t-slate-400',
  qualified: 'border-t-[#0066cc]',
  proposal: 'border-t-[#ffc107]',
  negotiation: 'border-t-purple-500',
  won: 'border-t-[#28a745]',
  lost: 'border-t-[#dc3545]',
};

export default function DealPipelinePage() {
  const navigate = useNavigate();
  const user = getUser();
  const { nameOf } = useUserDirectory();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [companyMap, setCompanyMap] = useState<Map<string, Company>>(new Map());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Deal | null>(null);

  async function load() {
    setLoading(true);
    const [dls, cos] = await Promise.all([fetchDeals(), fetchCompanies()]);
    setDeals(dls);
    setCompanyMap(new Map(cos.map((c) => [c.id, c])));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (!user) { navigate('/login'); return null; }

  const totalByStage = (stage: DealStage) =>
    deals.filter((d) => d.stage === stage).reduce((s, d) => s + (d.amount ?? 0), 0);

  const wonTotal = totalByStage('won');
  const pipelineTotal = deals
    .filter((d) => !['won', 'lost'].includes(d.stage))
    .reduce((s, d) => s + (d.amount ?? 0), 0);

  async function handleMoveStage(deal: Deal, next: DealStage) {
    try {
      await updateDeal(deal.id, { stage: next });
      await load();
    } catch (err: any) {
      alert(err.response?.data?.detail ?? '단계 변경 실패');
    }
  }

  return (
    <PageLayout title="CRM — 딜 파이프라인" subtitle="6단계 영업 흐름 · 단계별 금액 집계">
      <CrmSubNav />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard title="진행중 딜" value={deals.filter((d) => !['won', 'lost'].includes(d.stage)).length} />
        <StatCard title="진행중 금액" value={`₩${pipelineTotal.toLocaleString()}`} />
        <StatCard title="성사(Won)" value={deals.filter((d) => d.stage === 'won').length} />
        <StatCard title="성사 금액" value={`₩${wonTotal.toLocaleString()}`} changeType="positive" />
      </div>

      <div className="flex justify-end mb-4">
        <Button onClick={() => setCreating(true)}>+ 새 딜</Button>
      </div>

      {loading ? (
        <div className="text-slate-500">불러오는 중…</div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pb-2">
        <div className="grid grid-flow-col auto-cols-[minmax(220px,1fr)] gap-3 lg:gap-4 min-w-[1200px]">
          {DEAL_STAGES.map((stage) => {
            const inStage = deals.filter((d) => d.stage === stage);
            return (
              <div key={stage} className={`bg-slate-50/80 rounded-lg border border-slate-200 border-t-4 ${STAGE_ACCENT[stage]} min-h-[360px] flex flex-col`}>
                <div className="px-4 pt-4 pb-3 border-b border-slate-200/60">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm text-slate-800">{DEAL_STAGE_LABELS[stage]}</h3>
                    <span className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full min-w-[24px] text-center">{inStage.length}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-700">₩{totalByStage(stage).toLocaleString()}</div>
                </div>
                <div className="px-3 py-3 space-y-2 flex-1">
                  {inStage.map((d) => (
                    <DealCard
                      key={d.id}
                      deal={d}
                      company={companyMap.get(d.company_id)}
                      ownerName={nameOf(d.owner_id)}
                      onClick={() => setSelected(d)}
                    />
                  ))}
                  {inStage.length === 0 && (
                    <div className="text-xs text-slate-400 text-center py-8">비어있음</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}

      {creating && (
        <CreateDealDialog
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); load(); }}
        />
      )}
      {selected && (
        <DealEditDrawer
          deal={selected}
          company={companyMap.get(selected.company_id)}
          canEdit={user.role === 'admin' || selected.owner_id === user.id}
          onClose={() => setSelected(null)}
          onMove={(s) => { handleMoveStage(selected, s); setSelected(null); }}
        />
      )}
    </PageLayout>
  );
}

function DealCard({
  deal, company, ownerName, onClick,
}: {
  deal: Deal; company?: Company; ownerName: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-slate-200 rounded-md p-3.5 hover:border-[#0066cc] hover:shadow-md transition cursor-pointer"
    >
      <p className="text-sm font-semibold text-slate-900 mb-1 leading-snug line-clamp-2">{deal.title}</p>
      <div className="text-xs text-slate-500 mb-2.5 truncate">{company?.name ?? '—'}</div>
      <div className="flex items-center justify-between text-xs gap-2">
        <span className="font-bold text-slate-900">
          {deal.amount ? `₩${deal.amount.toLocaleString()}` : '—'}
        </span>
        <span className="text-slate-500 truncate">{ownerName}</span>
      </div>
      {deal.expected_close_date && (
        <div className="text-xs text-slate-400 mt-1.5 pt-1.5 border-t border-slate-100">
          ~ {deal.expected_close_date}
        </div>
      )}
    </button>
  );
}

function DealEditDrawer({
  deal, company, canEdit, onClose, onMove,
}: {
  deal: Deal; company?: Company; canEdit: boolean;
  onClose: () => void; onMove: (stage: DealStage) => void;
}) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  async function handleCreateProject() {
    if (!confirm(`"${deal.title}" 딜로 새 프로젝트를 생성할까요?`)) return;
    setCreating(true);
    try {
      const project = await createProjectFromDeal(deal.id);
      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      alert(err.response?.data?.detail ?? '생성 실패');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg p-6 w-[480px] shadow-xl">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-xs text-slate-500">{company?.name ?? '—'}</div>
            <h3 className="text-lg font-semibold">{deal.title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 p-1" aria-label="닫기"><X size={18} /></button>
        </div>
        <div className="text-sm text-slate-600 mb-4">
          현재 단계: <b>{DEAL_STAGE_LABELS[deal.stage]}</b>
          {deal.amount && ` · ₩${deal.amount.toLocaleString()}`}
          {deal.expected_close_date && ` · 마감 ${deal.expected_close_date}`}
        </div>
        {deal.notes && (
          <p className="text-sm whitespace-pre-wrap bg-slate-50 p-3 rounded mb-4">{deal.notes}</p>
        )}

        <div className="border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500 mb-2">
            {canEdit ? '단계 이동' : 'admin 또는 담당자만 단계를 변경할 수 있습니다'}
          </p>
          <div className="grid grid-cols-3 gap-1">
            {DEAL_STAGES.filter((s) => s !== deal.stage).map((s) => (
              <button
                key={s}
                disabled={!canEdit}
                onClick={() => onMove(s)}
                className="text-xs px-2 py-1.5 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50"
              >
                → {DEAL_STAGE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {deal.stage === 'won' && canEdit && (
          <div className="border-t border-slate-200 pt-4 mt-4">
            <p className="text-xs text-slate-500 mb-2">계약 성사된 딜</p>
            <Button onClick={handleCreateProject} disabled={creating} className="w-full !bg-[#28a745] hover:!bg-[#1b7e34]">
              {creating ? '생성 중…' : '이 딜로 프로젝트 생성 →'}
            </Button>
          </div>
        )}

        <div className="mt-4 text-right">
          <Link to={`/crm/companies/${deal.company_id}`} className="text-xs text-[#0066cc] hover:underline">
            고객사 상세 →
          </Link>
        </div>
      </div>
    </div>
  );
}
