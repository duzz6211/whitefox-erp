import { useState } from 'react';
import type { Box, FlowStatus } from '../types';
import { FLOW_STATUS_LABELS } from '../types';
import { transitionBox } from '../api/endpoints';

const ALLOWED: Record<FlowStatus, FlowStatus[]> = {
  wait: ['working'],
  working: ['pickup', 'blocked'],
  pickup: ['working'],
  blocked: ['review'],
  review: ['done', 'working'],
  done: [],
};

interface Props {
  box: Box;
  onClose: () => void;
  onDone: () => void;
}

export default function TransitionDialog({ box, onClose, onDone }: Props) {
  const allowed = ALLOWED[box.flow_status];
  const [to, setTo] = useState<FlowStatus | ''>(allowed[0] ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!to) return;
    setBusy(true);
    setError('');
    try {
      await transitionBox(box.id, to, message);
      onDone();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? '전이 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg p-5 sm:p-6 w-full max-w-[460px] mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-lg font-semibold mb-1">상태 전이</h2>
        <p className="text-sm text-slate-500 mb-4 truncate">{box.title}</p>

        <label className="block text-sm font-medium mb-1">다음 상태</label>
        <select
          className="w-full border border-slate-300 rounded px-3 py-2 mb-4"
          value={to}
          onChange={(e) => setTo(e.target.value as FlowStatus)}
          required
        >
          {allowed.length === 0 && <option value="">가능한 전이 없음</option>}
          {allowed.map((s) => (
            <option key={s} value={s}>
              {FLOW_STATUS_LABELS[box.flow_status]} → {FLOW_STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium mb-1">
          로그 메시지 <span className="text-slate-400">(최소 10자)</span>
        </label>
        <textarea
          className="w-full border border-slate-300 rounded px-3 py-2 mb-2 h-24 resize-none"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          minLength={10}
          required
        />
        <p className="text-xs text-slate-400 mb-4">{message.length}자</p>

        {error && <p className="text-rose-600 text-sm mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">
            취소
          </button>
          <button
            type="submit"
            disabled={busy || !to || message.length < 10}
            className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? '처리중…' : '전이'}
          </button>
        </div>
      </form>
    </div>
  );
}
