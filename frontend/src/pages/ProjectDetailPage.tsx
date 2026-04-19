import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import { Card, CardHeader, CardBody, Button, StatusPill } from '../components/ui';
import AttachmentPanel from '../components/AttachmentPanel';
import EditProjectDialog from '../components/EditProjectDialog';
import {
  fetchBrief,
  fetchBriefVersions,
  fetchProject,
  updateBrief,
  updateProject,
  type Brief,
  type BriefVersion,
} from '../api/endpoints';
import { getUser } from '../lib/auth';
import type { Project } from '../types';
import { PROJECT_CATEGORY_LABELS } from '../types';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = getUser();
  const [project, setProject] = useState<Project | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [versions, setVersions] = useState<BriefVersion[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ requirements: '', client_info: '', change_reason: '' });
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<BriefVersion | null>(null);
  const [editingMeta, setEditingMeta] = useState(false);

  const isAdmin = user?.role === 'admin';

  async function load() {
    if (!id) return;
    const [p, b, vs] = await Promise.all([fetchProject(id), fetchBrief(id), fetchBriefVersions(id)]);
    setProject(p);
    setBrief(b);
    setVersions(vs);
    setDraft({ requirements: b.requirements, client_info: b.client_info, change_reason: '' });
  }

  useEffect(() => { load(); }, [id]);

  if (!user) { navigate('/login'); return null; }

  async function handleSaveBrief() {
    if (!id) return;
    if (draft.change_reason.trim().length < 5) {
      setSaveError('변경 사유는 최소 5자 이상 필요합니다');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const updated = await updateBrief(id, draft);
      setBrief(updated);
      setVersions(await fetchBriefVersions(id));
      setDraft({ ...draft, change_reason: '' });
      setEditing(false);
    } catch (err: any) {
      setSaveError(err.response?.data?.detail ?? '저장 실패');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(next: 'completed' | 'archived' | 'active') {
    if (!id) return;
    const msg = next === 'completed' ? '완료 처리할까요?' : next === 'archived' ? '아카이브할까요?' : '활성 복구할까요?';
    if (!confirm(msg)) return;
    setProject(await updateProject(id, { status: next }));
  }

  if (!project || !brief) {
    return (
      <PageLayout title="프로젝트 상세"><div className="text-slate-500">불러오는 중…</div></PageLayout>
    );
  }

  return (
    <PageLayout title={project.name} subtitle={`${PROJECT_CATEGORY_LABELS[project.category] ?? project.category} · priority ${project.priority}`}>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <Link to="/projects" className="text-sm text-slate-500 hover:text-slate-900">← 프로젝트 목록</Link>
        <div className="flex gap-2">
          <Link to={`/flow-board?project=${project.id}`}>
            <Button variant="secondary">플로우보드 →</Button>
          </Link>
          {isAdmin && (
            <>
              <Button variant="secondary" onClick={() => setEditingMeta(true)}>수정</Button>
              {project.status === 'active' && (
                <>
                  <Button onClick={() => handleStatus('completed')} className="!bg-[#28a745] hover:!bg-[#1b7e34]">완료 처리</Button>
                  <Button variant="ghost" onClick={() => handleStatus('archived')}>아카이브</Button>
                </>
              )}
              {project.status !== 'active' && (
                <Button variant="secondary" onClick={() => handleStatus('active')}>활성 복구</Button>
              )}
            </>
          )}
        </div>
      </div>

      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center gap-3">
            {project.status === 'active' && <StatusPill tone="active">진행중</StatusPill>}
            {project.status === 'completed' && <StatusPill tone="success">완료</StatusPill>}
            {project.status === 'archived' && <StatusPill tone="neutral">아카이브</StatusPill>}
            <span className="text-xs text-slate-500">생성 {new Date(project.created_at).toLocaleDateString('ko-KR')}</span>
          </div>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader
          title={<><span>기획서 (Brief)</span> <span className="ml-2 text-xs text-slate-500 font-normal">현재 v{brief.current_version}</span></>}
          action={isAdmin && !editing && (
            <Button onClick={() => setEditing(true)}>편집</Button>
          )}
        />
        <CardBody>
          {editing ? (
            <div className="space-y-3">
              <Field label="요구사항" value={draft.requirements} onChange={(v) => setDraft({ ...draft, requirements: v })} rows={8} />
              <Field label="클라이언트 정보" value={draft.client_info} onChange={(v) => setDraft({ ...draft, client_info: v })} rows={4} />
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  변경 사유 <span className="text-[#dc3545]">*</span> (최소 5자, 버전 스냅샷에 기록됨)
                </label>
                <input
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
                  value={draft.change_reason}
                  onChange={(e) => setDraft({ ...draft, change_reason: e.target.value })}
                />
              </div>
              {saveError && <p className="text-[#dc3545] text-sm">{saveError}</p>}
              <div className="flex gap-2">
                <Button onClick={handleSaveBrief} disabled={saving}>{saving ? '저장 중…' : '저장'}</Button>
                <Button variant="ghost" onClick={() => {
                  setEditing(false);
                  setDraft({ requirements: brief.requirements, client_info: brief.client_info, change_reason: '' });
                  setSaveError('');
                }}>취소</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <ReadOnly label="요구사항" value={brief.requirements} />
              <ReadOnly label="클라이언트 정보" value={brief.client_info} />
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardBody>
          <AttachmentPanel
            targetType="brief"
            targetId={brief.id}
            label="Brief 첨부 파일"
            canUpload={isAdmin}
            currentUserId={user.id}
            isAdmin={isAdmin}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`버전 히스토리 (${versions.length})`} />
        <CardBody>
          {versions.length === 0 ? (
            <p className="text-sm text-slate-400">아직 변경 기록이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {versions.map((v) => (
                <li key={v.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-900">v{v.version_number}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(v.created_at).toLocaleString()} · {v.change_reason}
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingVersion(v)}
                    className="text-sm text-[#0066cc] hover:underline"
                  >
                    스냅샷 보기
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {viewingVersion && <VersionViewer version={viewingVersion} onClose={() => setViewingVersion(null)} />}
      {editingMeta && project && (
        <EditProjectDialog
          project={project}
          onClose={() => setEditingMeta(false)}
          onSaved={(p) => { setProject(p); setEditingMeta(false); }}
        />
      )}
    </PageLayout>
  );
}

function Field({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows: number }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full border border-slate-300 rounded px-3 py-2 text-sm resize-none"
      />
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="whitespace-pre-wrap text-slate-800 bg-slate-50 border border-slate-200 rounded p-3 min-h-[3rem]">
        {value.trim() || <span className="text-slate-400 italic">비어있음</span>}
      </div>
    </div>
  );
}

function VersionViewer({ version, onClose }: { version: BriefVersion; onClose: () => void }) {
  let snapshot: { requirements?: string; client_info?: string } = {};
  try { snapshot = JSON.parse(version.snapshot_json); } catch {}
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg p-6 w-[640px] max-h-[80vh] overflow-y-auto shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">v{version.version_number} 스냅샷</h3>
            <div className="text-xs text-slate-500">
              {new Date(version.created_at).toLocaleString()} · {version.change_reason}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 p-1" aria-label="닫기"><X size={18} /></button>
        </div>
        <div className="space-y-3 text-sm">
          <ReadOnly label="요구사항" value={snapshot.requirements ?? ''} />
          <ReadOnly label="클라이언트 정보" value={snapshot.client_info ?? ''} />
        </div>
      </div>
    </div>
  );
}
