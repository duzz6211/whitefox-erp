import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { Card, Tabs } from '../components/ui';
import { fetchActivity, fetchAudit } from '../api/endpoints';
import { getUser } from '../lib/auth';
import { useUserDirectory } from '../lib/users';
import type { Activity, ActivityType } from '../types';

const TYPE_LABELS: Record<ActivityType, string> = {
  box_created: '박스 생성', box_transitioned: '박스 전이', box_picked_up: '픽업',
  box_reassigned: '재지정', box_deleted: '박스 삭제', box_risk_flagged: '리스크',
  project_created: '프로젝트 생성', project_completed: '프로젝트 완료', project_archived: '프로젝트 아카이브',
  brief_updated: 'Brief 수정', company_created: '고객사 등록',
  deal_created: '딜 생성', deal_stage_changed: '딜 단계',
  invoice_created: '인보이스 발행', invoice_status_changed: '인보이스 상태', invoice_deleted: '인보이스 삭제',
  member_invited: '멤버 초대', member_deactivated: '멤버 비활성화',
};

const TYPE_TONE: Partial<Record<ActivityType, string>> = {
  box_risk_flagged: 'bg-[#dc3545]/15 text-[#b01020]',
  box_deleted: 'bg-[#dc3545]/15 text-[#b01020]',
  invoice_deleted: 'bg-[#dc3545]/15 text-[#b01020]',
  member_deactivated: 'bg-[#dc3545]/15 text-[#b01020]',
  box_reassigned: 'bg-purple-100 text-purple-700',
  project_archived: 'bg-purple-100 text-purple-700',
  project_completed: 'bg-[#28a745]/15 text-[#1b5e20]',
  invoice_status_changed: 'bg-[#ffc107]/20 text-[#8a6100]',
  brief_updated: 'bg-[#5c9ce6]/20 text-[#0066cc]',
};

function dayKey(iso: string): string { return iso.slice(0, 10); }
function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}
function dateLabel(key: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(key + 'T00:00:00');
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return '오늘';
  if (diff === 1) return '어제';
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

export default function ActivityPage() {
  const navigate = useNavigate();
  const user = getUser();
  const { nameOf } = useUserDirectory();
  const [items, setItems] = useState<Activity[]>([]);
  const [mode, setMode] = useState<'all' | 'audit'>('all');
  const [loading, setLoading] = useState(true);

  async function load(m: 'all' | 'audit') {
    setLoading(true);
    setItems(m === 'audit' ? await fetchAudit(200) : await fetchActivity(100));
    setLoading(false);
  }

  useEffect(() => { load(mode); }, [mode]);

  if (!user) { navigate('/login'); return null; }

  const isAdmin = user.role === 'admin';

  const groups = new Map<string, Activity[]>();
  for (const a of items) {
    const k = dayKey(a.created_at);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(a);
  }

  return (
    <PageLayout
      title={mode === 'audit' ? '감사 로그' : '활동 타임라인'}
      subtitle={mode === 'audit'
        ? '삭제·재지정·아카이브·비활성화 등 민감한 작업 추적'
        : '팀에서 일어난 모든 변경을 시간순으로'}
    >
      {isAdmin && (
        <Card className="mb-6">
          <Tabs
            items={[
              { value: 'all', label: '전체 활동' },
              { value: 'audit', label: '감사 로그' },
            ]}
            value={mode}
            onChange={(v) => setMode(v as 'all' | 'audit')}
          />
        </Card>
      )}

      {loading ? (
        <div className="text-slate-500">불러오는 중…</div>
      ) : items.length === 0 ? (
        <Card><div className="p-10 text-center text-slate-500 text-sm">기록된 활동이 없습니다.</div></Card>
      ) : (
        <div className="space-y-6">
          {Array.from(groups.entries()).map(([day, list]) => (
            <section key={day}>
              <h3 className="text-xs font-semibold text-slate-500 mb-2">{dateLabel(day)}</h3>
              <Card>
                <ol className="divide-y divide-slate-100">
                  {list.map((a) => (
                    <li key={a.id} className="px-5 py-3 flex items-start gap-3">
                      <div className="text-xs text-slate-400 w-14 shrink-0 mt-0.5 font-mono">
                        {timeOnly(a.created_at)}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${TYPE_TONE[a.type] ?? 'bg-slate-100 text-slate-600'}`}>
                        {TYPE_LABELS[a.type] ?? a.type}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-slate-900">{a.summary}</div>
                        {a.meta?.reason && (
                          <div className="text-xs text-slate-500 mt-0.5">사유: {a.meta.reason}</div>
                        )}
                        <div className="text-xs text-slate-400 mt-0.5">
                          {a.actor_id ? nameOf(a.actor_id) : '시스템'}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </Card>
            </section>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
