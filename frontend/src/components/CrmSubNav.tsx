import { Tabs } from './ui';
import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { value: '/crm', label: '고객사' },
  { value: '/crm/deals', label: '딜 파이프라인' },
  { value: '/crm/invoices', label: '인보이스' },
];

export default function CrmSubNav() {
  const loc = useLocation();
  const navigate = useNavigate();
  const current = (() => {
    if (loc.pathname.startsWith('/crm/deals')) return '/crm/deals';
    if (loc.pathname.startsWith('/crm/invoices')) return '/crm/invoices';
    return '/crm';
  })();
  return (
    <div className="bg-white rounded shadow-card mb-6">
      <Tabs items={TABS} value={current} onChange={(v) => navigate(v)} />
    </div>
  );
}
