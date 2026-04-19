import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { searchAll } from '../api/endpoints';
import type { SearchResult } from '../types';

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchAll(q.trim());
        setResults(r);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function go(path: string) {
    navigate(path);
    setOpen(false);
    setQ('');
  }

  const total =
    (results?.boxes.length ?? 0) +
    (results?.projects.length ?? 0) +
    (results?.companies.length ?? 0) +
    (results?.invoices.length ?? 0);

  return (
    <div ref={ref} className="relative">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
      />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="박스·프로젝트·회사·인보이스 검색"
        className="w-full md:w-72 border border-slate-300 rounded pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-slate-500"
      />
      {open && q.trim() && (
        <div className="absolute top-full left-0 right-0 md:right-auto mt-1 md:w-[480px] bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-[500px] overflow-y-auto">
          {loading && <div className="p-3 text-xs text-slate-500">검색 중…</div>}
          {!loading && results && total === 0 && (
            <div className="p-4 text-sm text-slate-500 text-center">결과 없음</div>
          )}
          {!loading && results && total > 0 && (
            <div className="py-2">
              {results.boxes.length > 0 && (
                <Section title="박스">
                  {results.boxes.map((b) => (
                    <Row
                      key={b.id}
                      onClick={() => go(`/flow-board?project=${b.project_id}`)}
                    >
                      <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mr-2">
                        {b.flow_status}
                      </span>
                      {b.title}
                    </Row>
                  ))}
                </Section>
              )}
              {results.projects.length > 0 && (
                <Section title="프로젝트">
                  {results.projects.map((p) => (
                    <Row key={p.id} onClick={() => go(`/projects/${p.id}`)}>
                      <span className="text-xs text-slate-500 mr-2">{p.category}</span>
                      {p.name}
                      {p.status !== 'active' && (
                        <span className="text-xs text-slate-400 ml-2">({p.status})</span>
                      )}
                    </Row>
                  ))}
                </Section>
              )}
              {results.companies.length > 0 && (
                <Section title="고객사">
                  {results.companies.map((c) => (
                    <Row key={c.id} onClick={() => go(`/crm/companies/${c.id}`)}>
                      {c.name}
                      {c.industry && (
                        <span className="text-xs text-slate-500 ml-2">· {c.industry}</span>
                      )}
                    </Row>
                  ))}
                </Section>
              )}
              {results.invoices.length > 0 && (
                <Section title="인보이스">
                  {results.invoices.map((i) => (
                    <Row key={i.id} onClick={() => go(`/crm/companies/${i.company_id}`)}>
                      <span className="font-mono text-xs text-slate-500 mr-2">
                        {i.invoice_number}
                      </span>
                      {i.title}
                      <span className="text-xs text-slate-400 ml-2">
                        ₩{i.amount.toLocaleString()}
                      </span>
                    </Row>
                  ))}
                </Section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="text-xs font-semibold text-slate-500 px-3 py-1 bg-slate-50">{title}</div>
      <ul>{children}</ul>
    </div>
  );
}

function Row({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition"
      >
        {children}
      </button>
    </li>
  );
}
