import { useEffect, useState } from 'react';
import type { Attachment } from '../types';
import {
  deleteAttachment,
  downloadUrl,
  fetchAttachments,
  uploadAttachment,
} from '../api/endpoints';
import { useUserDirectory } from '../lib/users';

interface Props {
  targetType: 'box' | 'brief' | 'log';
  targetId: string;
  label?: string;
  canUpload?: boolean;
  currentUserId: string;
  isAdmin: boolean;
}

export default function AttachmentPanel({
  targetType,
  targetId,
  label = '첨부 파일',
  canUpload = true,
  currentUserId,
  isAdmin,
}: Props) {
  const { nameOf } = useUserDirectory();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    setAttachments(await fetchAttachments(targetType, targetId));
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, [targetType, targetId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      await uploadAttachment(targetType, targetId, f);
      reload();
    } catch (err: any) {
      alert(err.response?.data?.detail ?? '업로드 실패');
    } finally {
      e.target.value = '';
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('파일을 삭제할까요?')) return;
    await deleteAttachment(id);
    reload();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm text-slate-900">
          {label} ({attachments.length})
        </h3>
        {canUpload && (
          <label className="text-xs text-blue-600 hover:underline cursor-pointer">
            + 업로드
            <input type="file" className="hidden" onChange={handleUpload} />
          </label>
        )}
      </div>
      {loading ? (
        <p className="text-xs text-slate-400">불러오는 중…</p>
      ) : attachments.length === 0 ? (
        <p className="text-xs text-slate-400">없음</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {attachments.map((a) => {
            const canDelete = a.uploaded_by === currentUserId || isAdmin;
            return (
              <li
                key={a.id}
                className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-2 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <a
                    href={downloadUrl(a.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline truncate block"
                  >
                    {a.file_name}
                  </a>
                  <div className="text-xs text-slate-500">
                    {nameOf(a.uploaded_by)} · {formatSize(a.file_size)}
                  </div>
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-xs text-rose-600 hover:underline ml-2"
                  >
                    삭제
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
