import { api } from './client';
import type {
  AsyncLog,
  Attachment,
  Box,
  Company,
  Contact,
  ContextCard,
  DashboardResponse,
  Deal,
  DealStage,
  FlowStatus,
  Invoice,
  InvoiceStatus,
  PickupRecord,
  Project,
  TokenResponse,
} from '../types';

export async function fetchUsers(includeInactive = false): Promise<import('../types').User[]> {
  const { data } = await api.get('/users', { params: includeInactive ? { include_inactive: true } : {} });
  return data;
}

export async function deactivateUser(id: string): Promise<import('../types').User> {
  const { data } = await api.post(`/users/${id}/deactivate`);
  return data;
}

export async function activateUser(id: string): Promise<import('../types').User> {
  const { data } = await api.post(`/users/${id}/activate`);
  return data;
}

export async function updateProfile(payload: { name?: string; job_title?: string | null }): Promise<import('../types').User> {
  const { data } = await api.patch('/auth/me', payload);
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post('/auth/me/password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export async function createProjectFromDeal(dealId: string): Promise<import('../types').Project> {
  const { data } = await api.post(`/deals/${dealId}/create-project`);
  return data;
}

import type { Activity, Notification, SearchResult } from '../types';

export async function fetchActivity(limit = 50): Promise<Activity[]> {
  const { data } = await api.get<Activity[]>('/activity', { params: { limit } });
  return data;
}

export async function fetchAudit(limit = 100): Promise<Activity[]> {
  const { data } = await api.get<Activity[]>('/audit', { params: { limit } });
  return data;
}

export async function fetchNotifications(onlyUnread = false): Promise<Notification[]> {
  const { data } = await api.get<Notification[]>('/notifications', {
    params: { only_unread: onlyUnread },
  });
  return data;
}

export async function fetchUnreadCount(): Promise<number> {
  const { data } = await api.get<{ unread: number }>('/notifications/unread-count');
  return data.unread;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post('/notifications/read-all');
}

export async function searchAll(q: string): Promise<SearchResult> {
  const { data } = await api.get<SearchResult>('/search', { params: { q } });
  return data;
}

export async function fetchOrganization(): Promise<import('../types').OrganizationInfo> {
  const { data } = await api.get('/organization');
  return data;
}

export async function updateOrganization(
  payload: Partial<Omit<import('../types').OrganizationInfo, 'id' | 'updated_at'>>,
): Promise<import('../types').OrganizationInfo> {
  const { data } = await api.put('/organization', payload);
  return data;
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'member';
}): Promise<import('../types').User> {
  const { data } = await api.post('/auth/register', payload);
  return data;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const form = new URLSearchParams();
  form.append('username', email);
  form.append('password', password);
  const { data } = await api.post<TokenResponse>('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

export async function fetchProjects(params?: { include_all?: boolean; status?: string }): Promise<Project[]> {
  const { data } = await api.get<Project[]>('/projects', { params });
  return data;
}

export async function fetchProject(id: string): Promise<Project> {
  const { data } = await api.get<Project>(`/projects/${id}`);
  return data;
}

export async function createProject(payload: {
  name: string;
  priority: number;
  category: string;
  company_id?: string | null;
}): Promise<Project> {
  const { data } = await api.post<Project>('/projects', payload);
  return data;
}

export async function updateProject(
  id: string,
  payload: Partial<{
    name: string;
    priority: number;
    category: string;
    status: 'active' | 'completed' | 'archived';
    company_id: string | null;
  }>,
): Promise<Project> {
  const { data } = await api.put<Project>(`/projects/${id}`, payload);
  return data;
}

// === CRM ===

export async function fetchCompanies(params?: { q?: string; status?: string }): Promise<Company[]> {
  const { data } = await api.get<Company[]>('/companies', { params });
  return data;
}

export async function fetchCompany(id: string): Promise<Company> {
  const { data } = await api.get<Company>(`/companies/${id}`);
  return data;
}

export async function createCompany(payload: Partial<Omit<Company, 'id' | 'created_at'>> & { name: string }): Promise<Company> {
  const { data } = await api.post<Company>('/companies', payload);
  return data;
}

export async function updateCompany(id: string, payload: Partial<Omit<Company, 'id' | 'created_at'>>): Promise<Company> {
  const { data } = await api.put<Company>(`/companies/${id}`, payload);
  return data;
}

export async function fetchContacts(companyId: string): Promise<Contact[]> {
  const { data } = await api.get<Contact[]>(`/companies/${companyId}/contacts`);
  return data;
}

export async function createContact(companyId: string, payload: Omit<Contact, 'id' | 'company_id' | 'created_at'>): Promise<Contact> {
  const { data } = await api.post<Contact>(`/companies/${companyId}/contacts`, payload);
  return data;
}

export async function updateContact(id: string, payload: Partial<Omit<Contact, 'id' | 'company_id' | 'created_at'>>): Promise<Contact> {
  const { data } = await api.put<Contact>(`/contacts/${id}`, payload);
  return data;
}

export async function deleteContact(id: string): Promise<void> {
  await api.delete(`/contacts/${id}`);
}

export async function fetchDeals(params?: { company_id?: string; stage?: DealStage; owner?: string }): Promise<Deal[]> {
  const { data } = await api.get<Deal[]>('/deals', { params });
  return data;
}

export async function createDeal(payload: Omit<Deal, 'id' | 'created_at'>): Promise<Deal> {
  const { data } = await api.post<Deal>('/deals', payload);
  return data;
}

export async function updateDeal(id: string, payload: Partial<Omit<Deal, 'id' | 'company_id' | 'created_at'>>): Promise<Deal> {
  const { data } = await api.put<Deal>(`/deals/${id}`, payload);
  return data;
}

export async function deleteDeal(id: string): Promise<void> {
  await api.delete(`/deals/${id}`);
}

export async function fetchInvoices(params?: { company_id?: string; status?: InvoiceStatus }): Promise<Invoice[]> {
  const { data } = await api.get<Invoice[]>('/invoices', { params });
  return data;
}

export async function fetchCompanyInvoices(companyId: string): Promise<Invoice[]> {
  const { data } = await api.get<Invoice[]>(`/companies/${companyId}/invoices`);
  return data;
}

export async function createInvoice(payload: Omit<Invoice, 'id' | 'status' | 'paid_date' | 'created_by' | 'created_at'> & { status?: InvoiceStatus }): Promise<Invoice> {
  const { data } = await api.post<Invoice>('/invoices', payload);
  return data;
}

export async function updateInvoice(id: string, payload: Partial<Omit<Invoice, 'id' | 'company_id' | 'created_by' | 'created_at'>>): Promise<Invoice> {
  const { data } = await api.put<Invoice>(`/invoices/${id}`, payload);
  return data;
}

export async function deleteInvoice(id: string): Promise<void> {
  await api.delete(`/invoices/${id}`);
}

export interface Brief {
  id: string;
  project_id: string;
  requirements: string;
  client_info: string;
  current_version: number;
  updated_at: string;
}

export interface BriefVersion {
  id: string;
  brief_id: string;
  version_number: number;
  snapshot_json: string;
  change_reason: string;
  created_by: string;
  created_at: string;
}

export async function fetchBrief(projectId: string): Promise<Brief> {
  const { data } = await api.get<Brief>(`/projects/${projectId}/brief`);
  return data;
}

export async function updateBrief(
  projectId: string,
  payload: { requirements: string; client_info: string; change_reason: string },
): Promise<Brief> {
  const { data } = await api.put<Brief>(`/projects/${projectId}/brief`, payload);
  return data;
}

export async function fetchBriefVersions(projectId: string): Promise<BriefVersion[]> {
  const { data } = await api.get<BriefVersion[]>(`/projects/${projectId}/brief/versions`);
  return data;
}

export async function fetchBoxes(
  params?: string | { project_id?: string; status?: FlowStatus; owner?: string; risk?: boolean },
): Promise<Box[]> {
  const query =
    typeof params === 'string' ? { project_id: params } : params ?? {};
  const { data } = await api.get<Box[]>('/boxes', { params: query });
  return data;
}

export async function createBox(projectId: string, payload: { title: string; deadline?: string | null; week_number?: number | null }): Promise<Box> {
  const { data } = await api.post<Box>(`/projects/${projectId}/boxes`, payload);
  return data;
}

export async function updateBox(boxId: string, payload: Partial<{ title: string; deadline: string | null; week_number: number | null }>): Promise<Box> {
  const { data } = await api.patch<Box>(`/boxes/${boxId}`, payload);
  return data;
}

export async function reassignBox(boxId: string, newOwnerId: string | null, reason: string): Promise<Box> {
  const { data } = await api.post<Box>(`/boxes/${boxId}/reassign`, {
    new_owner_id: newOwnerId,
    reason,
  });
  return data;
}

export async function deleteBox(boxId: string, reason: string): Promise<void> {
  await api.delete(`/boxes/${boxId}`, { data: { reason } });
}

export async function transitionBox(
  boxId: string,
  to: FlowStatus,
  log_message: string,
): Promise<Box> {
  const { data } = await api.patch<Box>(`/boxes/${boxId}/transition`, { to, log_message });
  return data;
}

export async function fetchLogs(boxId: string): Promise<AsyncLog[]> {
  const { data } = await api.get<AsyncLog[]>(`/boxes/${boxId}/logs`);
  return data;
}

export async function addComment(boxId: string, content: string): Promise<AsyncLog> {
  const { data } = await api.post<AsyncLog>(`/boxes/${boxId}/logs`, { content });
  return data;
}

export async function fetchContext(boxId: string): Promise<ContextCard> {
  const { data } = await api.get<ContextCard>(`/boxes/${boxId}/context`);
  return data;
}

export async function saveContext(boxId: string, payload: Omit<ContextCard, 'id' | 'box_id' | 'updated_at'>): Promise<ContextCard> {
  const { data } = await api.put<ContextCard>(`/boxes/${boxId}/context`, payload);
  return data;
}

export async function fetchPickups(boxId: string): Promise<PickupRecord[]> {
  const { data } = await api.get<PickupRecord[]>(`/boxes/${boxId}/pickups`);
  return data;
}

export async function fetchAttachments(targetType: 'box' | 'brief' | 'log', targetId: string): Promise<Attachment[]> {
  const { data } = await api.get<Attachment[]>('/files', {
    params: { target_type: targetType, target_id: targetId },
  });
  return data;
}

export async function uploadAttachment(
  targetType: 'box' | 'brief' | 'log',
  targetId: string,
  file: File,
): Promise<Attachment> {
  const form = new FormData();
  form.append('target_type', targetType);
  form.append('target_id', targetId);
  form.append('file', file);
  const { data } = await api.post<Attachment>('/files', form);
  return data;
}

export async function deleteAttachment(id: string): Promise<void> {
  await api.delete(`/files/${id}`);
}

export function downloadUrl(id: string): string {
  return `/api/files/${id}/download`;
}

export async function fetchDashboard(): Promise<DashboardResponse> {
  const { data } = await api.get<DashboardResponse>('/dashboard');
  return data;
}

// === Billing (admin only) ===

import type { Billing, BillingPayment, MonthlySummary } from '../types';

export async function fetchBillings(activeOnly = true): Promise<Billing[]> {
  const { data } = await api.get<Billing[]>('/billing', { params: { active_only: activeOnly } });
  return data;
}

export async function createBilling(payload: Omit<Billing, 'id' | 'is_active' | 'created_by' | 'created_at'>): Promise<Billing> {
  const { data } = await api.post<Billing>('/billing', payload);
  return data;
}

export async function updateBilling(id: string, payload: Partial<Omit<Billing, 'id' | 'created_by' | 'created_at'>>): Promise<Billing> {
  const { data } = await api.put<Billing>(`/billing/${id}`, payload);
  return data;
}

export async function deleteBilling(id: string): Promise<void> {
  await api.delete(`/billing/${id}`);
}

export async function fetchPayments(billingId: string): Promise<BillingPayment[]> {
  const { data } = await api.get<BillingPayment[]>(`/billing/${billingId}/payments`);
  return data;
}

export async function addPayment(billingId: string, payload: { amount: number; paid_date: string; notes?: string }): Promise<BillingPayment> {
  const { data } = await api.post<BillingPayment>(`/billing/${billingId}/payments`, payload);
  return data;
}

export async function deletePayment(billingId: string, paymentId: string): Promise<void> {
  await api.delete(`/billing/${billingId}/payments/${paymentId}`);
}

export async function fetchMonthlySummary(year?: number): Promise<MonthlySummary[]> {
  const { data } = await api.get<MonthlySummary[]>('/billing/summary/monthly', { params: year ? { year } : {} });
  return data;
}
