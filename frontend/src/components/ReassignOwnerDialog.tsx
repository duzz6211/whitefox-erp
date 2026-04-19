import { useState } from 'react';
import { reassignBox } from '../api/endpoints';
import type { Box } from '../types';
import { useUserDirectory } from '../lib/users';

interface Props {
  box: Box;
  onClose: () => void;
  onDone: () => void;
}

export default function ReassignOwnerDialog({ box, onClose, onDone }: Props) {
  const { users, nameOf } = useUserDirectory();
  const [newOwnerId, setNewOwnerId] = useState(box.owner_id ?? '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const activeUsers = users.filter((u) => u.is_active);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setError('사유는 최소 10자 이상 필요합니다');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await reassignBox(box.id, newOwnerId || null, reason.trim());
      onDone();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? '재지정 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60]" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg p-5 sm:p-6 w-full max-w-[460px] mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-semibold mb-1">Owner 재지정</h2>
        <p className="text-sm text-slate-500 mb-4 truncate">{box.title}</p>

        <label className="block text-sm font-medium mb-1">
          현재 담당자: <span className="text-slate-900">{nameOf(box.owner_id)}</span>
        </label>

        <label className="block text-sm font-medium mb-1 mt-3">새 담당자</label>
        <select
          className="w-full border border-slate-300 rounded px-3 py-2 mb-4"
          value={newOwnerId}
          onChange={(e) => setNewOwnerId(e.target.value)}
        >
          <option value="">(없음 — 백로그로 반환)</option>
          {activeUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
              {u.job_title && ` · ${u.job_title}`}
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium mb-1">
          사유 <span className="text-rose-500">*</span>{' '}
          <span className="text-slate-400 text-xs">(최소 10자, 시스템 로그에 기록됨)</span>
        </label>
        <textarea
          className="w-full border border-slate-300 rounded px-3 py-2 mb-2 h-24 resize-none"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          minLength={10}
          required
        />
        <p className="text-xs text-slate-400 mb-3">{reason.length}자</p>

        {error && <p className="text-rose-600 text-sm mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">
            취소
          </button>
          <button
            type="submit"
            disabled={busy || reason.trim().length < 10}
            className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? '재지정 중…' : '재지정'}
          </button>
        </div>
      </form>
    </div>
  );
}
