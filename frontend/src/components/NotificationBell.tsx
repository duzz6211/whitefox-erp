import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/endpoints';
import type { Notification } from '../types';

const POLL_INTERVAL_MS = 30_000;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

function targetUrl(n: Notification): string {
  const a = n.activity;
  switch (a.subject_type) {
    case 'box':
      return '/flow-board';
    case 'project':
      return `/projects/${a.subject_id}`;
    case 'company':
      return `/crm/companies/${a.subject_id}`;
    case 'invoice':
      return `/crm/invoices`;
    case 'deal':
      return `/crm/deals`;
    default:
      return '/activity';
  }
}

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function refreshCount() {
    try {
      setUnread(await fetchUnreadCount());
    } catch {
      // ignore
    }
  }

  async function loadList() {
    setLoading(true);
    try {
      setItems(await fetchNotifications(false));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  }

  async function handleClickItem(n: Notification) {
    if (!n.read_at) {
      await markNotificationRead(n.id);
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    window.location.assign(targetUrl(n));
  }

  async function handleReadAll() {
    await markAllNotificationsRead();
    setUnread(0);
    loadList();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="relative text-slate-500 hover:text-slate-900 p-1.5"
        title="알림"
        aria-label="알림"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-0 right-0 bg-[#dc3545] text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-[min(400px,calc(100vw-2rem))] bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-[calc(100vh-100px)] overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 sticky top-0 bg-white">
            <span className="text-sm font-semibold">알림</span>
            <div className="flex items-center gap-3 text-xs">
              {unread > 0 && (
                <button onClick={handleReadAll} className="text-blue-600 hover:underline">
                  모두 읽음
                </button>
              )}
              <Link
                to="/activity"
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-900"
              >
                전체 활동 →
              </Link>
            </div>
          </div>
          {loading && <div className="p-4 text-xs text-slate-500">불러오는 중…</div>}
          {!loading && items.length === 0 && (
            <div className="p-6 text-sm text-slate-500 text-center">알림 없음</div>
          )}
          <ul>
            {items.map((n) => (
              <li
                key={n.id}
                className={`border-b border-slate-100 last:border-0 ${
                  !n.read_at ? 'bg-blue-50/40' : ''
                }`}
              >
                <button
                  onClick={() => handleClickItem(n)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 transition"
                >
                  <div className="text-sm text-slate-900">{n.activity.summary}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {timeAgo(n.activity.created_at)}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
