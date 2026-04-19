import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { Card, Avatar, Button, StatusPill } from '../components/ui';
import { activateUser, deactivateUser, fetchUsers, registerUser } from '../api/endpoints';
import { getUser } from '../lib/auth';
import { useUserDirectory } from '../lib/users';
import type { User } from '../types';

export default function MembersPage() {
  const navigate = useNavigate();
  const user = getUser();
  const { reload: reloadDirectory } = useUserDirectory();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  async function load() {
    setLoading(true);
    setUsers(await fetchUsers(showInactive));
    setLoading(false);
  }

  useEffect(() => { load(); }, [showInactive]);

  async function handleDeactivate(id: string, name: string) {
    if (!confirm(`${name}님을 비활성화할까요? 로그인이 차단되며, 과거 기록은 보존됩니다.`)) return;
    await deactivateUser(id);
    await load();
    reloadDirectory();
  }

  async function handleActivate(id: string) {
    await activateUser(id);
    await load();
    reloadDirectory();
  }

  if (!user) { navigate('/login'); return null; }

  const isAdmin = user.role === 'admin';

  return (
    <PageLayout title="멤버" subtitle="팀 구성원 관리 · 초대 · 비활성화">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-2 rounded shadow-card cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          비활성 포함
        </label>
        {isAdmin && <Button onClick={() => setInviting(true)}>+ 멤버 초대</Button>}
      </div>

      <Card>
        <div className="px-5 py-4 border-b border-slate-200 font-semibold">
          멤버 목록 ({users.length})
        </div>
        {loading ? (
          <div className="p-6 text-slate-500">불러오는 중…</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-5 py-3 text-left">이름</th>
                <th className="px-5 py-3 text-left">이메일</th>
                <th className="px-5 py-3 text-center">역할</th>
                <th className="px-5 py-3 text-center">상태</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isMe = u.id === user.id;
                return (
                  <tr key={u.id} className={`hover:bg-slate-50 ${!u.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size={36} />
                        <div>
                          <div className="font-medium text-slate-900">{u.name}</div>
                          {u.job_title && <div className="text-xs text-slate-500">{u.job_title}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{u.email}</td>
                    <td className="px-5 py-3 text-center">
                      {u.role === 'admin' ? (
                        <StatusPill tone="info">관리자</StatusPill>
                      ) : (
                        <StatusPill tone="neutral">멤버</StatusPill>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {u.is_active ? (
                        <StatusPill tone="active">Active</StatusPill>
                      ) : (
                        <StatusPill tone="neutral">비활성</StatusPill>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isAdmin && !isMe && (
                        u.is_active ? (
                          <button onClick={() => handleDeactivate(u.id, u.name)} className="text-xs text-[#dc3545] hover:underline">
                            비활성화
                          </button>
                        ) : (
                          <button onClick={() => handleActivate(u.id)} className="text-xs text-[#0066cc] hover:underline">
                            복구
                          </button>
                        )
                      )}
                      {isMe && <span className="text-xs text-slate-400">본인</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </Card>

      {inviting && (
        <InviteDialog
          onClose={() => setInviting(false)}
          onInvited={() => { setInviting(false); load(); reloadDirectory(); }}
        />
      )}
    </PageLayout>
  );
}

function InviteDialog({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [jobTitle, setJobTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await registerUser({
        name: name.trim(), email: email.trim(), password, role,
        job_title: jobTitle.trim() || null,
      } as any);
      onInvited();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? '초대 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg p-6 w-[460px] shadow-xl">
        <h2 className="text-lg font-semibold mb-4">멤버 초대</h2>

        <Field label="이름" value={name} onChange={setName} required autoFocus />
        <Field label="이메일" type="email" value={email} onChange={setEmail} required />
        <Field label="초기 비밀번호 (최소 6자)" type="text" value={password} onChange={setPassword} required mono />
        <p className="text-xs text-slate-500 mb-3 -mt-1">
          초대 후 사용자에게 이 비밀번호를 전달하세요.
        </p>
        <Field label="직책 (표시용)" value={jobTitle} onChange={setJobTitle} placeholder="예: 개발자" />

        <label className="block text-sm font-medium mb-1">역할</label>
        <select className="w-full border border-slate-300 rounded px-3 py-2 mb-4" value={role} onChange={(e) => setRole(e.target.value as any)}>
          <option value="member">멤버</option>
          <option value="admin">관리자</option>
        </select>

        {error && <p className="text-[#dc3545] text-sm mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>취소</Button>
          <Button type="submit" disabled={busy}>{busy ? '초대 중…' : '초대'}</Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', required, autoFocus, placeholder, mono,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; autoFocus?: boolean; placeholder?: string; mono?: boolean;
}) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoFocus={autoFocus}
        placeholder={placeholder}
        minLength={type === 'password' || label.includes('비밀번호') ? 6 : undefined}
        className={`w-full border border-slate-300 rounded px-3 py-2 ${mono ? 'font-mono text-sm' : ''}`}
      />
    </div>
  );
}
