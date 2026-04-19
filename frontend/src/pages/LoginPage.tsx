import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { login } from '../api/endpoints';
import { saveAuth } from '../lib/auth';
import { Button } from '../components/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login(email, password);
      saveAuth(res.access_token, res.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message ?? '로그인 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
      <div className="flex w-full max-w-4xl shadow-card rounded-lg overflow-hidden bg-white">
        {/* 좌측 브랜딩 */}
        <div className="hidden md:flex flex-col justify-center w-1/2 bg-[#343a40] text-white p-10">
          <div className="text-3xl font-bold tracking-wider mb-2">WHITEFOX</div>
          <div className="text-sm text-white/60 mb-8">ERP</div>
          <p className="text-sm text-white/80 leading-relaxed">
            4인 스타트업을 위한 통합 업무 시스템.<br />
            플로우보드, CRM, 재무, 활동 로그를<br />
            한 화면에서 관리하세요.
          </p>
          <ul className="mt-10 space-y-2 text-xs text-white/60">
            <li className="flex items-center gap-2"><Check size={14} className="text-[#5c9ce6]" /> 원자적 박스 기반 Pull 협업</li>
            <li className="flex items-center gap-2"><Check size={14} className="text-[#5c9ce6]" /> 고객사·딜·인보이스 통합 관리</li>
            <li className="flex items-center gap-2"><Check size={14} className="text-[#5c9ce6]" /> 리스크·감사 로그 자동 추적</li>
          </ul>
        </div>

        {/* 우측 로그인 */}
        <form onSubmit={handleSubmit} className="w-full md:w-1/2 p-10">
          <h1 className="text-2xl font-semibold text-slate-900 mb-1">로그인</h1>
          <p className="text-sm text-slate-500 mb-6">계정 정보를 입력하세요</p>

          <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
          <input
            className="w-full border border-slate-300 rounded px-3 py-2 mb-4 focus:outline-none focus:border-[#0066cc]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />

          <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
          <input
            className="w-full border border-slate-300 rounded px-3 py-2 mb-4 focus:outline-none focus:border-[#0066cc]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
            required
          />

          {error && <p className="text-[#dc3545] text-sm mb-3">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? '로그인 중…' : '로그인'}
          </Button>

          <p className="text-xs text-slate-400 mt-6 text-center">
            계정이 없다면 관리자에게 초대를 요청하세요.
          </p>
        </form>
      </div>
    </div>
  );
}
