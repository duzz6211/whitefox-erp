import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Card, CardBody, Button, StatusPill } from '../components/ui';
import BoxDetailDrawer from '../components/BoxDetailDrawer';
import { fetchBoxes, fetchProjects } from '../api/endpoints';
import { supabase } from '../api/supabase';
import { getUser } from '../lib/auth';
import { useUserDirectory } from '../lib/users';
import type { Box, Project } from '../types';
import { FLOW_STATUS_LABELS } from '../types';
import { daysInStatus, deadlineLabel, deadlineUrgency, URGENCY_COLORS } from '../lib/deadline';

export default function RiskViewPage() {
  const navigate = useNavigate();
  const user = getUser();
  const { nameOf } = useUserDirectory();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [recheckBusy, setRecheckBusy] = useState(false);
  const [detail, setDetail] = useState<Box | null>(null);

  async function load() {
    setLoading(true);
    const [riskBoxes, allProjects] = await Promise.all([
      fetchBoxes({ risk: true }),
      fetchProjects({ include_all: true }),
    ]);
    setBoxes(riskBoxes);
    setProjects(allProjects);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (!user) { navigate('/login'); return null; }

  const isAdmin = user.role === 'admin';
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  async function handleRecheck() {
    setRecheckBusy(true);
    try {
      await supabase.rpc('check_risk_boxes');
      await load();
      alert(boxes.length > 0
        ? '리스크 체크 완료. 목록이 갱신되었습니다.'
        : '추가로 탐지된 리스크 박스가 없습니다.');
    } catch (err: any) {
      alert(err.message ?? '실행 실패');
    } finally {
      setRecheckBusy(false);
    }
  }

  const sorted = [...boxes].sort(
    (a, b) => daysInStatus(b.status_changed_at) - daysInStatus(a.status_changed_at),
  );

  return (
    <PageLayout title="리스크" subtitle="외부 대기 24시간 초과 또는 수동 리스크 표시된 박스">
      {isAdmin && (
        <div className="flex justify-end mb-4">
          <Button variant="secondary" onClick={handleRecheck} disabled={recheckBusy}>
            {recheckBusy ? '검사 중…' : '지금 다시 검사'}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500">불러오는 중…</div>
      ) : boxes.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <CheckCircle2 size={48} className="mx-auto text-[#28a745] mb-3" />
              <div className="text-lg font-semibold text-slate-900 mb-1">리스크 박스가 없습니다</div>
              <div className="text-sm text-slate-500">
                모든 외부 대기 박스가 24시간 이내거나 해소되었습니다.
              </div>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((b) => {
            const project = projectMap.get(b.project_id);
            const days = daysInStatus(b.status_changed_at);
            const urgency = deadlineUrgency(b.deadline);
            return (
              <button
                key={b.id}
                onClick={() => setDetail(b)}
                className="w-full text-left bg-white rounded shadow-card border-l-4 border-[#dc3545] p-5 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <StatusPill tone="danger">
                        <span className="inline-flex items-center gap-1"><AlertTriangle size={12} /> 리스크</span>
                      </StatusPill>
                      <StatusPill tone="neutral">{FLOW_STATUS_LABELS[b.flow_status]}</StatusPill>
                      {project && <span className="text-xs text-slate-500">{project.name}</span>}
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mb-2">{b.title}</h3>
                    <div className="text-xs text-slate-600 flex items-center gap-3 flex-wrap">
                      <span>
                        {FLOW_STATUS_LABELS[b.flow_status]} 상태로{' '}
                        <b className="text-[#dc3545]">{days}일째</b>
                      </span>
                      {b.owner_id && <span>· owner: {nameOf(b.owner_id)}</span>}
                    </div>
                  </div>
                  {b.deadline && (
                    <div className={`text-xs px-3 py-2 rounded border text-center min-w-[120px] ${URGENCY_COLORS[urgency]}`}>
                      <div className="font-medium">{deadlineLabel(b.deadline)}</div>
                      <div className="opacity-70 mt-0.5">{b.deadline}</div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {detail && (
        <BoxDetailDrawer
          box={detail}
          currentUserId={user.id}
          isAdmin={isAdmin}
          onClose={() => setDetail(null)}
          onChanged={() => { setDetail(null); load(); }}
        />
      )}
    </PageLayout>
  );
}
