import { useEffect, useState } from 'react';
import { fetchCompanies, updateProject } from '../api/endpoints';
import type { Company, Project, ProjectCategory } from '../types';
import { PROJECT_CATEGORY_LABELS } from '../types';

interface Props {
  project: Project;
  onClose: () => void;
  onSaved: (p: Project) => void;
}

const CATEGORIES: ProjectCategory[] = [
  'internal_ops',
  'client_work',
  'marketing',
  'design',
  'product',
  'research',
];

export default function EditProjectDialog({ project, onClose, onSaved }: Props) {
  const [name, setName] = useState(project.name);
  const [priority, setPriority] = useState(project.priority);
  const [category, setCategory] = useState<ProjectCategory>(project.category);
  const [companyId, setCompanyId] = useState<string>(project.company_id ?? '');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCompanies({ status: 'active' }).then(setCompanies);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const updated = await updateProject(project.id, {
        name: name.trim(),
        priority,
        category,
        company_id: companyId || null,
      });
      onSaved(updated);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? '수정 실패');
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
        <h2 className="text-lg font-semibold mb-4">프로젝트 수정</h2>

        <label className="block text-sm font-medium mb-1">이름</label>
        <input
          className="w-full border border-slate-300 rounded px-3 py-2 mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">우선순위 (1~10)</label>
            <input
              type="number"
              min={1}
              max={10}
              className="w-full border border-slate-300 rounded px-3 py-2"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">카테고리</label>
            <select
              className="w-full border border-slate-300 rounded px-3 py-2"
              value={category}
              onChange={(e) => setCategory(e.target.value as ProjectCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {PROJECT_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="block text-sm font-medium mb-1">연결 고객사</label>
        <select
          className="w-full border border-slate-300 rounded px-3 py-2 mb-4"
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
        >
          <option value="">없음 (내부 프로젝트)</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {error && <p className="text-rose-600 text-sm mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">
            취소
          </button>
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? '저장 중…' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
