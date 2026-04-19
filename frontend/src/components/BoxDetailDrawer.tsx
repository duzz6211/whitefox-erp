import { useEffect, useState } from 'react';
import type { AsyncLog, Box, ContextCard, PickupRecord } from '../types';
import { FLOW_STATUS_LABELS } from '../types';
import {
  addComment,
  fetchContext,
  fetchLogs,
  fetchPickups,
  saveContext,
  updateBox,
} from '../api/endpoints';
import { X, AlertTriangle } from 'lucide-react';
import TransitionDialog from './TransitionDialog';
import AttachmentPanel from './AttachmentPanel';
import EditBoxDialog from './EditBoxDialog';
import DatePicker from './DatePicker';
import ReassignOwnerDialog from './ReassignOwnerDialog';
import { useUserDirectory } from '../lib/users';
import { deadlineLabel, deadlineUrgency, URGENCY_COLORS } from '../lib/deadline';

interface Props {
  box: Box;
  currentUserId: string;
  isAdmin: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export default function BoxDetailDrawer({ box: initialBox, currentUserId, isAdmin, onClose, onChanged }: Props) {
  const { nameOf } = useUserDirectory();
  const [box, setBox] = useState<Box>(initialBox);
  const [logs, setLogs] = useState<AsyncLog[]>([]);
  const [pickups, setPickups] = useState<PickupRecord[]>([]);
  const [context, setContext] = useState<ContextCard | null>(null);
  const [comment, setComment] = useState('');
  const [editingContext, setEditingContext] = useState(false);
  const [ctxDraft, setCtxDraft] = useState({ why: '', success_criteria: '', decision_history: '' });
  const [transOpen, setTransOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineDraft, setDeadlineDraft] = useState(box.deadline ?? '');
  const [loading, setLoading] = useState(true);

  const canEditContext = box.owner_id === currentUserId || isAdmin;
  const canEditMeta = box.owner_id === currentUserId || isAdmin;

  async function load() {
    setLoading(true);
    const [l, p, c] = await Promise.all([
      fetchLogs(box.id),
      fetchPickups(box.id),
      fetchContext(box.id),
    ]);
    setLogs(l);
    setPickups(p);
    setContext(c);
    setCtxDraft({ why: c.why, success_criteria: c.success_criteria, decision_history: c.decision_history });
    setLoading(false);
  }

  useEffect(() => {
    setBox(initialBox);
    setDeadlineDraft(initialBox.deadline ?? '');
    load();

  }, [initialBox.id]);

  async function handleComment() {
    if (!comment.trim()) return;
    await addComment(box.id, comment.trim());
    setComment('');
    const l = await fetchLogs(box.id);
    setLogs(l);
  }

  async function handleSaveContext() {
    const updated = await saveContext(box.id, ctxDraft);
    setContext(updated);
    setEditingContext(false);
  }

  async function handleSaveDeadline() {
    const updated = await updateBox(box.id, { deadline: deadlineDraft || null });
    setBox(updated);
    setEditingDeadline(false);
    onChanged();
  }

  return (
    <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="fixed right-0 top-0 h-full w-full sm:w-[min(560px,100vw)] bg-white shadow-2xl overflow-y-auto"
      >
        <header className="sticky top-0 bg-white border-b border-slate-200 p-4 z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-slate-500 mb-1 flex items-center gap-1 flex-wrap">
                <span>{FLOW_STATUS_LABELS[box.flow_status]}</span>
                {box.owner_id === currentUserId && <span>· 내 박스</span>}
                {box.risk_flag && (
                  <span className="inline-flex items-center gap-1 text-[#dc3545]">
                    · <AlertTriangle size={12} /> 리스크
                  </span>
                )}
              </div>
              <h2 className="text-lg font-semibold text-slate-900">{box.title}</h2>
            </div>
            <div className="flex gap-2 items-start">
              <button
                onClick={() => setTransOpen(true)}
                className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-slate-800"
              >
                전이
              </button>
              {canEditMeta && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="text-sm border border-slate-300 text-slate-700 px-3 py-1.5 rounded hover:bg-slate-50"
                >
                  편집
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setReassignOpen(true)}
                  className="text-sm border border-slate-300 text-slate-700 px-3 py-1.5 rounded hover:bg-slate-50"
                  title="Owner 재지정 (admin)"
                >
                  재지정
                </button>
              )}
              <button onClick={onClose} className="text-slate-400 hover:text-slate-900 p-1" aria-label="닫기">
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="text-slate-500">마감일:</span>
            {editingDeadline ? (
              <>
                <DatePicker
                  value={deadlineDraft}
                  onChange={setDeadlineDraft}
                  placeholder="날짜 선택"
                  compact
                />
                <button
                  onClick={handleSaveDeadline}
                  className="text-blue-600 hover:underline"
                >
                  저장
                </button>
                <button
                  onClick={() => {
                    setDeadlineDraft(box.deadline ?? '');
                    setEditingDeadline(false);
                  }}
                  className="text-slate-500"
                >
                  취소
                </button>
                {box.deadline && (
                  <button
                    onClick={async () => {
                      setDeadlineDraft('');
                      const updated = await updateBox(box.id, { deadline: null });
                      setBox(updated);
                      setEditingDeadline(false);
                      onChanged();
                    }}
                    className="text-rose-600 hover:underline ml-1"
                  >
                    해제
                  </button>
                )}
              </>
            ) : (
              <>
                {box.deadline ? (
                  <span
                    className={`px-1.5 py-0.5 rounded border ${URGENCY_COLORS[deadlineUrgency(box.deadline)]}`}
                  >
                    {box.deadline} · {deadlineLabel(box.deadline)}
                  </span>
                ) : (
                  <span className="text-slate-400">없음</span>
                )}
                {canEditMeta && (
                  <button
                    onClick={() => {
                      setDeadlineDraft(box.deadline ?? '');
                      setEditingDeadline(true);
                    }}
                    className="text-blue-600 hover:underline ml-1"
                  >
                    편집
                  </button>
                )}
              </>
            )}
          </div>
        </header>

        {loading ? (
          <div className="p-6 text-slate-500">불러오는 중…</div>
        ) : (
          <div className="p-4 space-y-6">
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm text-slate-900">Context Card</h3>
                {canEditContext && !editingContext && (
                  <button
                    onClick={() => setEditingContext(true)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    편집
                  </button>
                )}
              </div>
              {editingContext ? (
                <div className="space-y-2">
                  <ContextField
                    label="왜 이 작업을 하는가"
                    value={ctxDraft.why}
                    onChange={(v) => setCtxDraft({ ...ctxDraft, why: v })}
                  />
                  <ContextField
                    label="뭘 해야 완료인가 (success criteria)"
                    value={ctxDraft.success_criteria}
                    onChange={(v) => setCtxDraft({ ...ctxDraft, success_criteria: v })}
                  />
                  <ContextField
                    label="의사결정 배경"
                    value={ctxDraft.decision_history}
                    onChange={(v) => setCtxDraft({ ...ctxDraft, decision_history: v })}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveContext}
                      className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        setEditingContext(false);
                        if (context)
                          setCtxDraft({
                            why: context.why,
                            success_criteria: context.success_criteria,
                            decision_history: context.decision_history,
                          });
                      }}
                      className="text-sm text-slate-600 px-3 py-1.5"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <ContextReadOnly label="Why" value={context?.why} />
                  <ContextReadOnly label="Success Criteria" value={context?.success_criteria} />
                  <ContextReadOnly label="Decision History" value={context?.decision_history} />
                </div>
              )}
            </section>

            <section>
              <AttachmentPanel
                targetType="box"
                targetId={box.id}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
              />
            </section>

            <section>
              <h3 className="font-medium text-sm text-slate-900 mb-2">Pickup 이력 ({pickups.length})</h3>
              {pickups.length === 0 ? (
                <p className="text-xs text-slate-400">없음</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {pickups.map((p) => (
                    <li key={p.id} className="bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                      <div className="text-xs text-slate-500">
                        {nameOf(p.completed_by)} → {nameOf(p.picked_by)} ·{' '}
                        {new Date(p.created_at).toLocaleString()}
                      </div>
                      <div>{p.note}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="font-medium text-sm text-slate-900 mb-2">로그 ({logs.length})</h3>
              <ul className="space-y-1 text-sm mb-2">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5"
                  >
                    <div className="text-xs text-slate-500">
                      {nameOf(log.author_id)} · {log.log_type} ·{' '}
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                    <div className="whitespace-pre-wrap">{log.content}</div>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                  placeholder="코멘트 추가"
                  className="flex-1 border border-slate-300 rounded px-2 py-1.5 text-sm"
                />
                <button
                  onClick={handleComment}
                  className="text-sm bg-slate-700 text-white px-3 rounded hover:bg-slate-600"
                >
                  추가
                </button>
              </div>
            </section>
          </div>
        )}
      </aside>

      {transOpen && (
        <TransitionDialog
          box={box}
          onClose={() => setTransOpen(false)}
          onDone={() => {
            setTransOpen(false);
            onChanged();
          }}
        />
      )}
      {editOpen && (
        <EditBoxDialog
          box={box}
          isAdmin={isAdmin}
          onClose={() => setEditOpen(false)}
          onSaved={(b) => {
            setBox(b);
            setEditOpen(false);
            onChanged();
          }}
          onDeleted={() => {
            setEditOpen(false);
            onChanged();
            onClose();
          }}
        />
      )}
      {reassignOpen && (
        <ReassignOwnerDialog
          box={box}
          onClose={() => setReassignOpen(false)}
          onDone={() => {
            setReassignOpen(false);
            onChanged();
            load();
          }}
        />
      )}
    </div>
  );
}

function ContextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm h-20 resize-none"
      />
    </div>
  );
}

function ContextReadOnly({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="whitespace-pre-wrap text-slate-800">
        {value?.trim() || <span className="text-slate-400 italic">비어있음</span>}
      </div>
    </div>
  );
}

