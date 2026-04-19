import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import FlowBoardPage from './pages/FlowBoardPage';
import DashboardPage from './pages/DashboardPage';
import ProjectListPage from './pages/ProjectListPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import MembersPage from './pages/MembersPage';
import CompanyListPage from './pages/CompanyListPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import DealPipelinePage from './pages/DealPipelinePage';
import InvoiceListPage from './pages/InvoiceListPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import RiskViewPage from './pages/RiskViewPage';
import ActivityPage from './pages/ActivityPage';
import InfoPage from './pages/InfoPage';
import BillingPage from './pages/BillingPage';
import { getToken } from './lib/auth';
import { UserDirectoryProvider } from './lib/users';

function Protected({ children }: { children: React.ReactNode }) {
  return getToken() ? (
    <UserDirectoryProvider>{children}</UserDirectoryProvider>
  ) : (
    <Navigate to="/login" replace />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/flow-board" element={<Protected><FlowBoardPage /></Protected>} />
        <Route path="/projects" element={<Protected><ProjectListPage /></Protected>} />
        <Route path="/projects/:id" element={<Protected><ProjectDetailPage /></Protected>} />
        <Route path="/members" element={<Protected><MembersPage /></Protected>} />
        <Route path="/crm" element={<Protected><CompanyListPage /></Protected>} />
        <Route path="/crm/companies/:id" element={<Protected><CompanyDetailPage /></Protected>} />
        <Route path="/crm/deals" element={<Protected><DealPipelinePage /></Protected>} />
        <Route path="/crm/invoices" element={<Protected><InvoiceListPage /></Protected>} />
        <Route path="/me" element={<Protected><ProfilePage /></Protected>} />
        <Route path="/risks" element={<Protected><RiskViewPage /></Protected>} />
        <Route path="/activity" element={<Protected><ActivityPage /></Protected>} />
        <Route path="/audit" element={<Protected><ActivityPage /></Protected>} />
        <Route path="/billing" element={<Protected><BillingPage /></Protected>} />
        <Route path="/info" element={<Protected><InfoPage /></Protected>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
