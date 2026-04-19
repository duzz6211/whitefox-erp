import { AlertTriangle, Calendar, User as UserIcon } from 'lucide-react';
import type { Box } from '../types';
import { useUserDirectory } from '../lib/users';

interface Props {
  box: Box;
  currentUserId: string;
  onClick: () => void;
}

export default function BoxCard({ box, currentUserId, onClick }: Props) {
  const { nameOf } = useUserDirectory();
  const isMine = box.owner_id === currentUserId;
  return (
    <button
      onClick={onClick}
      className={`group w-full text-left bg-white border rounded-md p-3.5 hover:border-[#0066cc] hover:shadow-md transition cursor-pointer ${
        isMine ? 'border-[#0066cc]/30 bg-[#5c9ce6]/5' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <p className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2 break-words">
          {box.title}
        </p>
        {box.risk_flag && (
          <span
            className="bg-[#dc3545]/15 text-[#b01020] p-1 rounded shrink-0"
            title="리스크"
          >
            <AlertTriangle size={12} strokeWidth={2.5} />
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1 min-w-0">
          <UserIcon size={11} className="shrink-0" />
          {box.owner_id ? (
            <span className={`truncate ${isMine ? 'text-[#0066cc] font-semibold' : ''}`}>
              {isMine ? '내 박스' : nameOf(box.owner_id)}
            </span>
          ) : (
            <span className="text-slate-400">미배정</span>
          )}
        </span>
        {box.deadline && (
          <span className="inline-flex items-center gap-1 shrink-0">
            <Calendar size={11} />
            {box.deadline}
          </span>
        )}
      </div>
    </button>
  );
}
