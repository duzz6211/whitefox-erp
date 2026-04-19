import { useState } from 'react';
import { deleteBox, updateBox } from '../api/endpoints';
import type { Box } from '../types';
import DatePicker from './DatePicker';

interface Props {
  box: Box;
  isAdmin: boolean;
  onClose: () => void;
  onSaved: (b: Box) => void;
  onDeleted: () => void;
}

export default function EditBoxDialog({ box, isAdmin, onClose, onSaved, onDeleted }: Props) {
  const [title, setTitle] = useState(box.title);
  const [deadline, setDeadline] = useState(box.deadline ?? '');
  const [weekNumber, setWeekNumber] = useState(box.week_number?.toString() ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError('');
    try {
      const updated = await updateBox(box.id, {
        title: title.trim(),
        deadline: deadline || null,
        week_number: weekNumber ? Number(weekNumber) : null,
      });
      onSaved(updated);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? '저장 실패');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (deleteReason.trim().length < 10) {
      setError('삭제 사유는 최소 10자 이상 필요합니다');
      return;
    }
    if (!confirm('정말 삭제할까요? 로그·Context·Pickup 기록이 모두 함께 삭제됩니다.')) return;
    setBusy(true);
    setError('');
    try {
      await deleteBox(box.id, deleteReason.trim());
      onDeleted();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? '삭제 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]" onClick={onClose}>
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg p-5 sm:p-6 w-full max-w-[460px] mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-semibold mb-4">박스 편집</h2>

        <label className="block text-sm font-medium mb-1">제목</label>
        <input
          className="w-full border border-slate-300 rounded px-3 py-2 mb-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">마감일</label>
            <DatePicker value={deadline} onChange={setDeadline} placeholder="마감일 선택" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">주차 (선택)</label>
            <input
              type="number"
              min={1}
              className="w-full border border-slate-300 rounded px-3 py-2"
              value={weekNumber}
              onChange={(e) => setWeekNumber(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-rose-600 text-sm mb-3">{error}</p>}

        <div className="flex gap-2 justify-end mb-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">
            취소
          </button>
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? '저장 중…' : '저장'}
          </button>
        </div>

        {isAdmin && (
          <div className="border-t border-slate-200 pt-4">
            {!showDelete ? (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="text-xs text-rose-600 hover:underline"
              >
                박스 삭제 (admin)
              </button>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs text-slate-500">
                  삭제 사유 (최소 10자) — 복구 불가
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full border border-rose-300 rounded px-2 py-1.5 text-sm h-16 resize-none"
                  minLength={10}
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDelete(false);
                      setDeleteReason('');
                    }}
                    className="text-xs text-slate-500 px-2"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={busy || deleteReason.trim().length < 10}
                    className="text-xs bg-rose-600 text-white px-3 py-1 rounded disabled:opacity-50"
                  >
                    삭제 확정
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
