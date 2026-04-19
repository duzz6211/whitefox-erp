import { Link, useLocation } from 'react-router-dom';
import { getToken } from '../lib/auth';
import { Button } from '../components/ui';

export default function NotFoundPage() {
  const loc = useLocation();
  const loggedIn = !!getToken();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] px-6">
      <div className="bg-white rounded-lg shadow-card p-10 text-center max-w-md w-full">
        <div className="text-7xl font-bold text-[#5c9ce6]/40 tracking-tight mb-3">404</div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">페이지를 찾을 수 없습니다</h1>
        <p className="text-sm text-slate-500 mb-6">
          <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{loc.pathname}</code> 에 해당하는 페이지가 없습니다.
        </p>
        <div className="flex gap-2 justify-center">
          <Link to={loggedIn ? '/dashboard' : '/login'}>
            <Button>{loggedIn ? '대시보드로' : '로그인으로'}</Button>
          </Link>
          <Button variant="secondary" onClick={() => window.history.back()}>
            이전 페이지
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-8 tracking-wider">WHITEFOX ERP</p>
      </div>
    </div>
  );
}
