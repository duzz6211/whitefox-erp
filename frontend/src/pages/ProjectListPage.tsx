import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { Card, CardBody, Button, StatusPill } from '../components/ui';
import CreateProjectDialog from '../components/CreateProjectDialog';
import { fetchProjects } from '../api/endpoints';
import { getUser } from '../lib/auth';
import type { Project } from '../types';
import { PROJECT_CATEGORY_LABELS } from '../types';

export default function ProjectListPage() {
  const navigate = useNavigate();
  const user = getUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showAll, setShowAll] = useState(false);

  async function load() {
    setLoading(true);
    setProjects(await fetchProjects(showAll ? { include_all: true } : undefined));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [showAll]);

  if (!user) {
    navigate('/login');
    return null;
  }

  const isAdmin = user.role === 'admin';
  const active = projects.filter((p) => p.status === 'active');
  const completed = projects.filter((p) => p.status === 'completed');
  const archived = projects.filter((p) => p.status === 'archived');

  return (
    <PageLayout title="프로젝트" subtitle="진행중인 프로젝트와 완료/아카이브 관리">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-2 rounded shadow-card cursor-pointer">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />
          완료/아카이브 포함
        </label>
        {isAdmin && (
          <Button onClick={() => setCreating(true)}>+ 새 프로젝트</Button>
        )}
      </div>

      {loading ? (
        <div className="text-slate-500">불러오는 중…</div>
      ) : projects.length === 0 ? (
        <Card>
          <CardBody>
            <div className="p-6 text-center text-slate-500 text-sm">
              아직 프로젝트가 없습니다.
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          <ProjectTable title="진행중" items={active} />
          {showAll && completed.length > 0 && (
            <ProjectTable title="완료됨" items={completed} />
          )}
          {showAll && archived.length > 0 && (
            <ProjectTable title="아카이브" items={archived} />
          )}
        </div>
      )}

      {creating && (
        <CreateProjectDialog
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            navigate(`/projects/${id}`);
          }}
        />
      )}
    </PageLayout>
  );
}

function ProjectTable({ title, items }: { title: string; items: Project[] }) {
  return (
    <Card>
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <span className="font-semibold">{title} ({items.length})</span>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[600px]">
        <thead className="bg-slate-50 text-xs text-slate-600">
          <tr>
            <th className="px-5 py-3 text-left">이름</th>
            <th className="px-5 py-3 text-left">카테고리</th>
            <th className="px-5 py-3 text-center">우선순위</th>
            <th className="px-5 py-3 text-center">상태</th>
            <th className="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50 transition cursor-pointer">
              <td className="px-5 py-3">
                <Link
                  to={`/projects/${p.id}`}
                  className="font-medium text-slate-900 hover:text-[#0066cc]"
                >
                  {p.name}
                </Link>
              </td>
              <td className="px-5 py-3 text-slate-600">
                {PROJECT_CATEGORY_LABELS[p.category] ?? p.category}
              </td>
              <td className="px-5 py-3 text-center text-slate-700">{p.priority}</td>
              <td className="px-5 py-3 text-center">
                {p.status === 'active' && <StatusPill tone="active">진행중</StatusPill>}
                {p.status === 'completed' && <StatusPill tone="success">완료</StatusPill>}
                {p.status === 'archived' && <StatusPill tone="neutral">아카이브</StatusPill>}
              </td>
              <td className="px-5 py-3 text-right">
                <Link to={`/projects/${p.id}`} className="text-[#0066cc] text-sm hover:underline">
                  상세 →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </Card>
  );
}
