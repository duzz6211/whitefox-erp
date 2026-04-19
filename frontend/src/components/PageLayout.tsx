import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import Sidebar from './Sidebar';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';
import { clearAuth, getUser } from '../lib/auth';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function PageLayout({ title, subtitle, children }: Props) {
  const user = getUser();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  function logout() {
    clearAuth();
    navigate('/login');
  }

  return (
    <div className="h-screen flex bg-[#f5f5f5] overflow-hidden">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="bg-white border-b border-slate-200 shrink-0 z-30">
          <div className="px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600 hover:text-slate-900 p-1 -ml-1 shrink-0"
              aria-label="메뉴 열기"
            >
              <Menu size={24} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="text-base lg:text-xl font-bold text-slate-900 truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">{subtitle}</p>
              )}
            </div>

            <div className="flex items-center gap-2 lg:gap-3 shrink-0">
              <div className="hidden md:block">
                <GlobalSearch />
              </div>
              <button
                onClick={() => setSearchOpen((v) => !v)}
                className="md:hidden text-slate-600 hover:text-slate-900 p-1"
                aria-label="검색"
              >
                <Search size={20} />
              </button>
              <NotificationBell />
              {user && (
                <div className="flex items-center gap-2 lg:gap-3 lg:pl-3 lg:border-l lg:border-slate-200">
                  <button
                    onClick={() => navigate('/me')}
                    className="flex items-center gap-2 hover:opacity-80"
                    aria-label="프로필"
                  >
                    <div className="w-8 h-8 lg:w-9 lg:h-9 bg-[#0066cc] text-white rounded-full flex items-center justify-center text-sm font-semibold shrink-0">
                      {user.name.charAt(0)}
                    </div>
                    <div className="text-left hidden lg:block">
                      <div className="text-sm font-medium text-slate-900 leading-tight">{user.name}</div>
                      <div className="text-xs text-slate-500 leading-tight">{user.job_title ?? user.role}</div>
                    </div>
                  </button>
                  <button
                    onClick={logout}
                    className="text-xs text-slate-500 hover:text-slate-900 hidden sm:block"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>

          {searchOpen && (
            <div className="md:hidden px-4 pb-3 border-t border-slate-100 pt-3">
              <GlobalSearch />
            </div>
          )}
        </header>
        <main className="flex-1 min-h-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
