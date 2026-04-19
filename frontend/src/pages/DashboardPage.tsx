import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Briefcase, Clock, Hand, Flame } from 'lucide-react';
import { fetchBoxes, fetchProjects } from '../api/endpoints';
import { getUser } from '../lib/auth';
import type { Box, FlowStatus, Project } from '../types';
import { FLOW_STATUS_LABELS, PROJECT_CATEGORY_LABELS } from '../types';
import PageLayout from '../components/PageLayout';
import { Card, CardHeader, CardBody, StatCard, StatusPill } from '../components/ui';
import BoxDetailDrawer from '../components/BoxDetailDrawer';
import { daysInStatus, deadlineLabel, deadlineUrgency, URGENCY_COLORS } from '../lib/deadline';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = getUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pickupBoxes, setPickupBoxes] = useState<Box[]>([]);
  const [myBoxes, setMyBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailBox, setDetailBox] = useState<Box | null>(null);

  async function load() {
    setLoading(true);
    const [projs, allBoxes] = await Promise.all([fetchProjects(), fetchBoxes()]);
    setProjects(projs);
    const activeProjectIds = new Set(projs.map((p) => p.id));
    const liveBoxes = allBoxes.filter((b) => activeProjectIds.has(b.project_id));
    if (user) {
      setPickupBoxes(
        liveBoxes.filter((b) => b.flow_status === 'pickup' && b.owner_id !== user.id),
      );
      setMyBoxes(
        liveBoxes.filter(
          (b) =>
            b.owner_id === user.id &&
            ['working', 'blocked', 'review'].includes(b.flow_status),
        ),
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (!user) {
    navigate('/login');
    return null;
  }

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const overdueCount = myBoxes.filter((b) => deadlineUrgency(b.deadline) === 'overdue').length;
  const todayCount = myBoxes.filter((b) => deadlineUrgency(b.deadline) === 'today').length;
  const riskCount = myBoxes.filter((b) => b.risk_flag).length;

  const STATUS_RANK: Record<FlowStatus, number> = {
    blocked: 0, working: 1, review: 2, wait: 99, pickup: 99, done: 99,
  };
  const URGENCY_RANK: Record<string, number> = {
    overdue: 0, today: 1, soon: 2, this_week: 3, later: 4, none: 5,
  };
  const sortedMyBoxes = [...myBoxes].sort((a, b) => {
    const ua = URGENCY_RANK[deadlineUrgency(a.deadline)];
    const ub = URGENCY_RANK[deadlineUrgency(b.deadline)];
    if (ua !== ub) return ua - ub;
    return STATUS_RANK[a.flow_status] - STATUS_RANK[b.flow_status];
  });

  return (
    <PageLayout title="대시보드" subtitle={`${user.name}님, 오늘도 수고하세요`}>
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="내 작업"
          value={myBoxes.length}
          change={myBoxes.length === 0 ? '작업 없음' : '진행 중'}
          icon={<Briefcase size={18} />}
          accent="blue"
        />
        <StatCard
          title="지난 마감"
          value={overdueCount}
          change={overdueCount > 0 ? '즉시 확인 필요' : '없음'}
          changeType={overdueCount > 0 ? 'negative' : 'positive'}
          icon={<Clock size={18} />}
          accent={overdueCount > 0 ? 'red' : 'slate'}
        />
        <StatCard
          title="가져올 수 있는 박스"
          value={pickupBoxes.length}
          change={pickupBoxes.length > 0 ? '팀에서 대기 중' : '없음'}
          icon={<Hand size={18} />}
          accent="amber"
        />
        <StatCard
          title="리스크"
          value={riskCount}
          change={riskCount > 0 ? '주의' : '모두 양호'}
          changeType={riskCount > 0 ? 'negative' : 'positive'}
          icon={<Flame size={18} />}
          accent={riskCount > 0 ? 'red' : 'slate'}
        />
      </div>

      {/* 상단 요약 배너 */}
      {(overdueCount + todayCount > 0) && (
        <div className="mb-6 bg-[#dc3545]/10 border-l-4 border-[#dc3545] rounded p-4 flex items-center gap-3">
          <AlertTriangle size={24} className="text-[#dc3545] shrink-0" />
          <div>
            <div className="font-semibold text-slate-900">주의할 마감이 있습니다</div>
            <div className="text-sm text-slate-600">
              지난 마감 {overdueCount}건 · 오늘 마감 {todayCount}건
            </div>
          </div>
        </div>
      )}

      {/* 내 작업 */}
      <Card className="mb-6">
        <CardHeader
          title={`내 작업 (${myBoxes.length})`}
          action={
            <Link to="/flow-board" className="text-sm text-[#0066cc] hover:underline">
              플로우보드 →
            </Link>
          }
        />
        <CardBody className="p-0">
          {loading ? (
            <div className="p-6 text-slate-500">불러오는 중…</div>
          ) : myBoxes.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">
              진행중인 내 작업이 없습니다. 아래 "가져올 수 있는 박스"에서 픽업해보세요.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sortedMyBoxes.map((b) => (
                <MyWorkRow
                  key={b.id}
                  box={b}
                  project={projectMap.get(b.project_id)}
                  onClick={() => setDetailBox(b)}
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card>
          <CardHeader title={`가져올 수 있는 박스 (${pickupBoxes.length})`} />
          <CardBody className="p-0">
            {loading ? null : pickupBoxes.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">없음</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pickupBoxes.map((b) => {
                  const project = projectMap.get(b.project_id);
                  const urgency = deadlineUrgency(b.deadline);
                  return (
                    <li key={b.id}>
                      <button
                        onClick={() => setDetailBox(b)}
                        className="w-full text-left px-5 py-3 hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <StatusPill tone="pending">픽업 대기</StatusPill>
                          <span className="font-medium text-slate-900 truncate">{b.title}</span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                          <span>{project?.name ?? '—'}</span>
                          {b.deadline && (
                            <span className={`px-1.5 py-0.5 rounded border ${URGENCY_COLORS[urgency]}`}>
                              {deadlineLabel(b.deadline)}
                            </span>
                          )}
                          {b.risk_flag && <span className="text-[#dc3545] inline-flex items-center gap-1"><AlertTriangle size={12} /> 리스크</span>}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={`진행중인 프로젝트 (${projects.length})`}
            action={
              <Link to="/projects" className="text-sm text-[#0066cc] hover:underline">
                전체 관리 →
              </Link>
            }
          />
          <CardBody className="p-0">
            {loading ? null : projects.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">없음</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/projects/${p.id}`}
                      className="block px-5 py-3 hover:bg-slate-50 transition"
                    >
                      <div className="font-medium text-slate-900 truncate">{p.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {PROJECT_CATEGORY_LABELS[p.category] ?? p.category} · priority {p.priority}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {detailBox && (
        <BoxDetailDrawer
          box={detailBox}
          currentUserId={user.id}
          isAdmin={user.role === 'admin'}
          onClose={() => setDetailBox(null)}
          onChanged={() => {
            setDetailBox(null);
            load();
          }}
        />
      )}
    </PageLayout>
  );
}

function MyWorkRow({
  box,
  project,
  onClick,
}: {
  box: Box;
  project?: Project;
  onClick: () => void;
}) {
  const urgency = deadlineUrgency(box.deadline);
  const days = daysInStatus(box.status_changed_at);
  const showStuck = days >= 3 && ['working', 'blocked'].includes(box.flow_status);
  const tone =
    box.flow_status === 'working' ? 'info' :
    box.flow_status === 'blocked' ? 'danger' :
    box.flow_status === 'review' ? 'pending' : 'neutral';

  return (
    <li>
      <button
        onClick={onClick}
        className="w-full text-left px-4 sm:px-5 py-4 hover:bg-slate-50 transition flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4"
      >
        <div className="flex items-center gap-2 sm:block shrink-0">
          <StatusPill tone={tone as any}>{FLOW_STATUS_LABELS[box.flow_status]}</StatusPill>
        </div>
        <div className="min-w-0 flex-1 w-full">
          <div className="font-semibold text-slate-900 mb-1 break-words">{box.title}</div>
          <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
            <span>{project?.name ?? '—'}</span>
            <span>·</span>
            <span>이 상태로 {days === 0 ? '오늘' : `${days}일째`}</span>
            {showStuck && <span className="text-[#dc3545] font-medium">· 진행 정체</span>}
            {box.risk_flag && <span className="text-[#dc3545] inline-flex items-center gap-1">· <AlertTriangle size={12} /> 리스크</span>}
          </div>
        </div>
        {box.deadline ? (
          <div className={`text-xs px-3 py-2 rounded border text-center w-full sm:w-auto sm:min-w-[120px] ${URGENCY_COLORS[urgency]}`}>
            <span className="font-medium">{deadlineLabel(box.deadline)}</span>
            <span className="opacity-70 ml-1 sm:ml-0 sm:block sm:mt-0.5">· {box.deadline}</span>
          </div>
        ) : (
          <div className="text-xs text-slate-400 px-3 py-2 border border-dashed border-slate-200 rounded w-full sm:w-auto sm:min-w-[120px] text-center">
            마감일 없음
          </div>
        )}
      </button>
    </li>
  );
}
