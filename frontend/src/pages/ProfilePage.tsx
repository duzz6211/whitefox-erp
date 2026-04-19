import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { Card, CardHeader, CardBody, Button, Avatar } from '../components/ui';
import { changePassword, updateProfile } from '../api/endpoints';
import { getToken, getUser, saveAuth } from '../lib/auth';
import { useUserDirectory } from '../lib/users';

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = getUser();
  const { reload } = useUserDirectory();
  const [name, setName] = useState(user?.name ?? '');
  const [jobTitle, setJobTitle] = useState(user?.job_title ?? '');
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  if (!user) { navigate('/login'); return null; }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileBusy(true);
    setProfileMsg(null);
    try {
      const updated = await updateProfile({ name: name.trim(), job_title: jobTitle.trim() || null });
      const token = getToken() ?? '';
      saveAuth(token, updated);
      reload();
      setProfileMsg({ type: 'ok', text: '프로필이 저장되었습니다.' });
    } catch (err: any) {
      setProfileMsg({ type: 'err', text: err.response?.data?.detail ?? '저장 실패' });
    } finally {
      setProfileBusy(false);
    }
  }

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPw.length < 6) {
      setPwMsg({ type: 'err', text: '새 비밀번호는 최소 6자 이상이어야 합니다.' });
      return;
    }
    if (newPw !== newPw2) {
      setPwMsg({ type: 'err', text: '새 비밀번호가 일치하지 않습니다.' });
      return;
    }
    setPwBusy(true);
    try {
      await changePassword(currentPw, newPw);
      setCurrentPw(''); setNewPw(''); setNewPw2('');
      setPwMsg({ type: 'ok', text: '비밀번호가 변경되었습니다.' });
    } catch (err: any) {
      setPwMsg({ type: 'err', text: err.response?.data?.detail ?? '변경 실패' });
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <PageLayout title="내 프로필" subtitle="기본 정보·비밀번호 변경">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 max-w-5xl">
        <Card className="lg:col-span-1 h-fit">
          <CardBody>
            <div className="flex flex-col items-center text-center py-4">
              <Avatar name={user.name} size={80} />
              <div className="mt-3 font-semibold text-lg text-slate-900">{user.name}</div>
              <div className="text-sm text-slate-500">{user.job_title ?? '직책 없음'}</div>
              <div className="text-xs text-slate-400 mt-1">
                {user.role === 'admin' ? '관리자' : '멤버'}
              </div>
              <div className="text-xs text-slate-500 mt-3 break-all">{user.email}</div>
            </div>
          </CardBody>
        </Card>

        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          <Card>
            <CardHeader title="기본 정보" />
            <CardBody>
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <Field label="이메일" value={user.email} disabled />
                <Field label="이름" value={name} onChange={setName} required />
                <Field label="직책" value={jobTitle} onChange={setJobTitle} placeholder="예: 개발자" />
                <Field label="역할" value={user.role === 'admin' ? '관리자' : '멤버'} disabled />
                {profileMsg && (
                  <p className={`text-sm ${profileMsg.type === 'ok' ? 'text-[#28a745]' : 'text-[#dc3545]'}`}>{profileMsg.text}</p>
                )}
                <Button type="submit" disabled={profileBusy || !name.trim()}>
                  {profileBusy ? '저장 중…' : '저장'}
                </Button>
              </form>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="비밀번호 변경" />
            <CardBody>
              <form onSubmit={handleChangePw} className="space-y-3">
                <Field label="현재 비밀번호" type="password" value={currentPw} onChange={setCurrentPw} required />
                <Field label="새 비밀번호 (최소 6자)" type="password" value={newPw} onChange={setNewPw} required />
                <Field label="새 비밀번호 확인" type="password" value={newPw2} onChange={setNewPw2} required />
                {pwMsg && (
                  <p className={`text-sm ${pwMsg.type === 'ok' ? 'text-[#28a745]' : 'text-[#dc3545]'}`}>{pwMsg.text}</p>
                )}
                <Button type="submit" disabled={pwBusy || !currentPw || !newPw || !newPw2}>
                  {pwBusy ? '변경 중…' : '비밀번호 변경'}
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}

function Field({
  label, value, onChange, type = 'text', required, placeholder, disabled,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full border border-slate-300 rounded px-3 py-2 text-sm ${disabled ? 'bg-slate-50 text-slate-500' : ''}`}
      />
    </div>
  );
}
