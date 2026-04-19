import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchBoxes, fetchProjects, createBox } from '../api/endpoints';
import type { Box, Project } from '../types';
import { FLOW_STATUSES, FLOW_STATUS_LABELS } from '../types';
import { getUser } from '../lib/auth';
import PageLayout from '../components/PageLayout';
import { Button } from '../components/ui';
import BoxCard from '../components/BoxCard';
import BoxDetailDrawer from '../components/BoxDetailDrawer';
import DatePicker from '../components/DatePicker';

const COLUMN_ACCENT: Record<string, string> = {
  wait: 'border-t-slate-400',
  working: 'border-t-[#0066cc]',
  pickup: 'border-t-[#ffc107]',
  blocked: 'border-t-[#dc3545]',
  review: 'border-t-purple-500',
  done: 'border-t-[#28a745]',
};

export default function FlowBoardPage() {
  const navigate = useNavigate();
  const user = getUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailBox, setDetailBox] = useState<Box | null>(null);
  const [newBoxTitle, setNewBoxTitle] = useState('');
  const [newBoxDeadline, setNewBoxDeadline] = useState('');

  async function reload() {
    if (!selectedProjectId) return;
    setLoading(true);
    setBoxes(await fetchBoxes(selectedProjectId));
    setLoading(false);
  }

  useEffect(() => {
    fetchProjects().then((data) => {
      setProjects(data);
      if (data.length === 0) return;
      const hinted = searchParams.get('project');
      const pick = hinted && data.find((p) => p.id === hinted) ? hinted : data[0].id;
      setSelectedProjectId(pick);
    });
  }, []);

  useEffect(() => {
    reload();
    if (selectedProjectId) setSearchParams({ project: selectedProjectId }, { replace: true });
  }, [selectedProjectId]);

  async function handleCreate() {
    if (!newBoxTitle.trim() || !selectedProjectId) return;
    await createBox(selectedProjectId, {
      title: newBoxTitle.trim(),
      deadline: newBoxDeadline || null,
    });
    setNewBoxTitle('');
    setNewBoxDeadline('');
    reload();
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <PageLayout title="플로우보드" subtitle="업무를 6단계로 쪼개어 이어받는 Pull 모델">
      <div className="bg-white rounded shadow-card p-3 sm:p-4 mb-6 flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="border border-slate-300 rounded px-3 py-2 text-sm bg-white w-full sm:w-auto"
        >
          {projects.length === 0 && <option value="">프로젝트 없음</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input
          placeholder="새 박스 제목"
          value={newBoxTitle}
          onChange={(e) => setNewBoxTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          disabled={!selectedProjectId}
          className="flex-1 min-w-0 border border-slate-300 rounded px-3 py-2 text-sm disabled:bg-slate-50"
        />
        <div className="flex gap-2 items-center">
          <DatePicker
            value={newBoxDeadline}
            onChange={setNewBoxDeadline}
            disabled={!selectedProjectId}
            placeholder="마감일"
            compact
            className="flex-1 sm:flex-initial sm:w-[180px]"
          />
          <Button onClick={handleCreate} disabled={!selectedProjectId || !newBoxTitle.trim()} className="shrink-0">
            추가
          </Button>
        </div>
      </div>

      {!selectedProjectId ? (
        <div className="bg-white rounded shadow-card p-10 text-center text-slate-500">
          먼저 프로젝트를 만드세요.
        </div>
      ) : loading ? (
        <div className="text-slate-500">불러오는 중…</div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pb-2">
        <div className="grid grid-flow-col auto-cols-[minmax(230px,1fr)] gap-3 lg:gap-4 min-w-[1200px]">
          {FLOW_STATUSES.map((status) => {
            const filtered = boxes.filter((b) => b.flow_status === status);
            return (
              <div
                key={status}
                className={`bg-slate-50/80 rounded-lg border border-slate-200 border-t-4 ${COLUMN_ACCENT[status]} min-h-[320px] flex flex-col`}
              >
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                  <h2 className="font-semibold text-sm text-slate-800">{FLOW_STATUS_LABELS[status]}</h2>
                  <span className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full min-w-[24px] text-center">
                    {filtered.length}
                  </span>
                </div>
                <div className="px-3 pb-3 space-y-2 flex-1">
                  {filtered.map((b) => (
                    <BoxCard
                      key={b.id}
                      box={b}
                      currentUserId={user.id}
                      onClick={() => setDetailBox(b)}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <div className="text-xs text-slate-400 text-center py-8">비어있음</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}

      {detailBox && (
        <BoxDetailDrawer
          box={detailBox}
          currentUserId={user.id}
          isAdmin={user.role === 'admin'}
          onClose={() => setDetailBox(null)}
          onChanged={() => {
            setDetailBox(null);
            reload();
          }}
        />
      )}
    </PageLayout>
  );
}
