import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Kanban, FolderKanban, AlertTriangle,
  ScrollText, Handshake, Users, Building2, CreditCard, X,
  type LucideIcon,
} from 'lucide-react';
import { getUser } from '../lib/auth';

interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  matcher: (path: string) => boolean;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: '대시보드', Icon: LayoutDashboard, matcher: (p) => p === '/dashboard' || p === '/' },
  { to: '/flow-board', label: '플로우보드', Icon: Kanban, matcher: (p) => p.startsWith('/flow-board') },
  { to: '/projects', label: '프로젝트', Icon: FolderKanban, matcher: (p) => p.startsWith('/projects') },
  { to: '/risks', label: '리스크', Icon: AlertTriangle, matcher: (p) => p.startsWith('/risks') },
  { to: '/activity', label: '활동', Icon: ScrollText, matcher: (p) => p.startsWith('/activity') || p.startsWith('/audit') },
  { to: '/crm', label: 'CRM', Icon: Handshake, matcher: (p) => p.startsWith('/crm') },
  { to: '/members', label: '멤버', Icon: Users, matcher: (p) => p.startsWith('/members') },
  { to: '/billing', label: '결제 관리', Icon: CreditCard, matcher: (p) => p.startsWith('/billing'), adminOnly: true },
  { to: '/info', label: '회사 정보', Icon: Building2, matcher: (p) => p.startsWith('/info') },
];

interface Props {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: Props) {
  const loc = useLocation();
  const currentUser = getUser();
  const isAdmin = currentUser?.role === 'admin';

  const visibleNav = NAV.filter((item) => !item.adminOnly || isAdmin);

  const content = (
    <>
      {/* 상단 고정 */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between shrink-0">
        <Link to="/dashboard" onClick={onClose} className="block">
          <div className="text-xl font-bold tracking-wider">WHITEFOX</div>
          <div className="text-xs text-white/50 mt-0.5">ERP</div>
        </Link>
        <button
          onClick={onClose}
          className="lg:hidden text-white/70 hover:text-white p-1"
          aria-label="닫기"
        >
          <X size={20} />
        </button>
      </div>
      {/* 중앙 스크롤 영역 */}
      <nav className="py-4 flex-1 min-h-0 overflow-y-auto">
        <ul>
          {visibleNav.map(({ to, label, Icon, matcher }) => {
            const active = matcher(loc.pathname);
            return (
              <li key={to}>
                <Link
                  to={to}
                  onClick={onClose}
                  className={`sidebar-link flex items-center gap-3 px-5 py-3 text-sm border-l-2 ${
                    active
                      ? 'bg-white/10 border-[#5c9ce6] text-white'
                      : 'border-transparent text-white/75 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={18} strokeWidth={2} className="shrink-0" />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* 하단 고정 */}
      <div className="px-5 py-4 border-t border-white/10 text-xs text-white/40 shrink-0">
        v0.4 · 2026
      </div>
    </>
  );

  return (
    <>
      {/* 데스크탑: 뷰포트 높이로 고정, 내부는 flex 컬럼 */}
      <aside className="hidden lg:flex sticky top-0 h-screen w-[230px] bg-[#343a40] text-white flex-col shrink-0">
        {content}
      </aside>

      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 w-[260px] bg-[#343a40] text-white flex flex-col z-50 transform transition-transform lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {content}
      </aside>
    </>
  );
}
