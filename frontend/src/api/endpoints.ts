import { supabase } from './supabase';
import type {
  AsyncLog, Attachment, Box, Company, Contact, ContextCard,
  DashboardResponse, Deal, DealStage, FlowStatus, Invoice,
  InvoiceStatus, PickupRecord, Project, TokenResponse,
  Activity, Notification, SearchResult, Billing, BillingPayment, MonthlySummary,
} from '../types';

function unwrap<T>(result: { data: T | null; error: any }): T {
  if (result.error) throw result.error;
  return result.data as T;
}

// === Auth ===

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const { data: userRow } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', data.user.id)
    .single();

  if (!userRow) throw new Error('User profile not found');

  return {
    access_token: data.session.access_token,
    token_type: 'bearer',
    user: userRow as any,
  };
}

export async function registerUser(payload: {
  name: string; email: string; password: string; role: 'admin' | 'member';
}): Promise<import('../types').User> {
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: { data: { name: payload.name, role: payload.role } },
  });
  if (error) throw error;

  await new Promise((r) => setTimeout(r, 500));

  const { data: userRow } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', data.user!.id)
    .single();

  return userRow as any;
}

export async function updateProfile(payload: { name?: string; job_title?: string | null }): Promise<import('../types').User> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error('Not authenticated');

  const { data } = await supabase
    .from('users')
    .update(payload)
    .eq('auth_id', authUser.id)
    .select()
    .single();

  return unwrap({ data, error: null });
}

export async function changePassword(_currentPassword: string, newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// === Users ===

export async function fetchUsers(includeInactive = false): Promise<import('../types').User[]> {
  let q = supabase.from('users').select('*').order('name');
  if (!includeInactive) q = q.eq('is_active', true);
  return unwrap(await q);
}

export async function deactivateUser(id: string): Promise<import('../types').User> {
  return unwrap(await supabase.from('users').update({ is_active: false }).eq('id', id).select().single());
}

export async function activateUser(id: string): Promise<import('../types').User> {
  return unwrap(await supabase.from('users').update({ is_active: true }).eq('id', id).select().single());
}

// === Projects ===

export async function fetchProjects(params?: { include_all?: boolean; status?: string }): Promise<Project[]> {
  let q = supabase.from('projects').select('*').order('priority', { ascending: true });
  if (params?.status) q = q.eq('status', params.status);
  if (!params?.include_all) q = q.neq('status', 'archived');
  return unwrap(await q);
}

export async function fetchProject(id: string): Promise<Project> {
  return unwrap(await supabase.from('projects').select('*').eq('id', id).single());
}

export async function createProject(payload: {
  name: string; priority: number; category: string; company_id?: string | null;
}): Promise<Project> {
  return unwrap(await supabase.from('projects').insert(payload).select().single());
}

export async function updateProject(
  id: string,
  payload: Partial<{ name: string; priority: number; category: string; status: string; company_id: string | null }>,
): Promise<Project> {
  return unwrap(await supabase.from('projects').update(payload).eq('id', id).select().single());
}

// === Boxes ===

export async function fetchBoxes(
  params?: string | { project_id?: string; status?: FlowStatus; owner?: string; risk?: boolean },
): Promise<Box[]> {
  let q = supabase.from('boxes').select('*').order('created_at', { ascending: false });
  const p = typeof params === 'string' ? { project_id: params } : params;
  if (p?.project_id) q = q.eq('project_id', p.project_id);
  if (p?.status) q = q.eq('flow_status', p.status);
  if (p?.owner) q = q.eq('owner_id', p.owner);
  if (p?.risk) q = q.eq('risk_flag', true);
  return unwrap(await q);
}

export async function createBox(projectId: string, payload: { title: string; deadline?: string | null; week_number?: number | null }): Promise<Box> {
  return unwrap(await supabase.from('boxes').insert({
    project_id: projectId,
    title: payload.title,
    deadline: payload.deadline || null,
    week_number: payload.week_number || null,
    flow_status: 'wait',
    risk_flag: false,
    status_changed_at: new Date().toISOString(),
  }).select().single());
}

export async function updateBox(boxId: string, payload: Partial<{ title: string; deadline: string | null; week_number: number | null }>): Promise<Box> {
  return unwrap(await supabase.from('boxes').update(payload).eq('id', boxId).select().single());
}

export async function transitionBox(boxId: string, to: FlowStatus, log_message: string): Promise<Box> {
  const { data, error } = await supabase.rpc('transition_box', {
    p_box_id: boxId,
    p_to_status: to,
    p_log_message: log_message,
  });
  if (error) throw error;
  return data as Box;
}

export async function reassignBox(boxId: string, newOwnerId: string | null, reason: string): Promise<Box> {
  const { data, error } = await supabase.rpc('reassign_box_owner', {
    p_box_id: boxId,
    p_new_owner_id: newOwnerId,
    p_reason: reason,
  });
  if (error) throw error;
  return data as Box;
}

export async function deleteBox(boxId: string, reason: string): Promise<void> {
  await supabase.from('async_logs').insert({
    box_id: boxId,
    author_id: (await getCurrentUserId())!,
    content: `삭제 사유: ${reason}`,
    log_type: 'system',
  });
  unwrap(await supabase.from('boxes').delete().eq('id', boxId));
}

// === Logs ===

export async function fetchLogs(boxId: string): Promise<AsyncLog[]> {
  return unwrap(await supabase.from('async_logs').select('*').eq('box_id', boxId).order('created_at'));
}

export async function addComment(boxId: string, content: string): Promise<AsyncLog> {
  const userId = await getCurrentUserId();
  return unwrap(await supabase.from('async_logs').insert({
    box_id: boxId,
    author_id: userId,
    content,
    log_type: 'comment',
  }).select().single());
}

// === Context Cards ===

export async function fetchContext(boxId: string): Promise<ContextCard> {
  return unwrap(await supabase.from('context_cards').select('*').eq('box_id', boxId).single());
}

export async function saveContext(boxId: string, payload: Omit<ContextCard, 'id' | 'box_id' | 'updated_at'>): Promise<ContextCard> {
  const { data: existing } = await supabase.from('context_cards').select('id').eq('box_id', boxId).single();
  if (existing) {
    return unwrap(await supabase.from('context_cards').update({ ...payload, updated_at: new Date().toISOString() }).eq('box_id', boxId).select().single());
  }
  return unwrap(await supabase.from('context_cards').insert({ box_id: boxId, ...payload }).select().single());
}

// === Pickups ===

export async function fetchPickups(boxId: string): Promise<PickupRecord[]> {
  return unwrap(await supabase.from('pickup_records').select('*').eq('box_id', boxId).order('created_at', { ascending: false }));
}

// === Briefs ===

export interface Brief {
  id: string; project_id: string; requirements: string; client_info: string;
  current_version: number; updated_at: string;
}

export interface BriefVersion {
  id: string; brief_id: string; version_number: number; snapshot_json: string;
  change_reason: string; created_by: string; created_at: string;
}

export async function fetchBrief(projectId: string): Promise<Brief> {
  return unwrap(await supabase.from('project_briefs').select('*').eq('project_id', projectId).single());
}

export async function updateBrief(
  projectId: string,
  payload: { requirements: string; client_info: string; change_reason: string },
): Promise<Brief> {
  const brief = await fetchBrief(projectId);
  const userId = await getCurrentUserId();
  const newVersion = brief.current_version + 1;

  await supabase.from('brief_versions').insert({
    brief_id: brief.id,
    version_number: newVersion,
    snapshot_json: JSON.stringify({ requirements: brief.requirements, client_info: brief.client_info }),
    change_reason: payload.change_reason,
    created_by: userId,
  });

  return unwrap(await supabase.from('project_briefs').update({
    requirements: payload.requirements,
    client_info: payload.client_info,
    current_version: newVersion,
    updated_at: new Date().toISOString(),
  }).eq('id', brief.id).select().single());
}

export async function fetchBriefVersions(projectId: string): Promise<BriefVersion[]> {
  const brief = await fetchBrief(projectId);
  return unwrap(await supabase.from('brief_versions').select('*').eq('brief_id', brief.id).order('version_number', { ascending: false }));
}

// === CRM: Companies ===

export async function fetchCompanies(params?: { q?: string; status?: string }): Promise<Company[]> {
  let q = supabase.from('companies').select('*').order('name');
  if (params?.status) q = q.eq('status', params.status);
  if (params?.q) q = q.ilike('name', `%${params.q}%`);
  return unwrap(await q);
}

export async function fetchCompany(id: string): Promise<Company> {
  return unwrap(await supabase.from('companies').select('*').eq('id', id).single());
}

export async function createCompany(payload: Partial<Omit<Company, 'id' | 'created_at'>> & { name: string }): Promise<Company> {
  return unwrap(await supabase.from('companies').insert(payload).select().single());
}

export async function updateCompany(id: string, payload: Partial<Omit<Company, 'id' | 'created_at'>>): Promise<Company> {
  return unwrap(await supabase.from('companies').update(payload).eq('id', id).select().single());
}

// === CRM: Contacts ===

export async function fetchContacts(companyId: string): Promise<Contact[]> {
  return unwrap(await supabase.from('contacts').select('*').eq('company_id', companyId).order('name'));
}

export async function createContact(companyId: string, payload: Omit<Contact, 'id' | 'company_id' | 'created_at'>): Promise<Contact> {
  return unwrap(await supabase.from('contacts').insert({ company_id: companyId, ...payload }).select().single());
}

export async function updateContact(id: string, payload: Partial<Omit<Contact, 'id' | 'company_id' | 'created_at'>>): Promise<Contact> {
  return unwrap(await supabase.from('contacts').update(payload).eq('id', id).select().single());
}

export async function deleteContact(id: string): Promise<void> {
  unwrap(await supabase.from('contacts').delete().eq('id', id));
}

// === CRM: Deals ===

export async function fetchDeals(params?: { company_id?: string; stage?: DealStage; owner?: string }): Promise<Deal[]> {
  let q = supabase.from('deals').select('*').order('created_at', { ascending: false });
  if (params?.company_id) q = q.eq('company_id', params.company_id);
  if (params?.stage) q = q.eq('stage', params.stage);
  if (params?.owner) q = q.eq('owner_id', params.owner);
  return unwrap(await q);
}

export async function createDeal(payload: Omit<Deal, 'id' | 'created_at'>): Promise<Deal> {
  return unwrap(await supabase.from('deals').insert(payload).select().single());
}

export async function updateDeal(id: string, payload: Partial<Omit<Deal, 'id' | 'company_id' | 'created_at'>>): Promise<Deal> {
  return unwrap(await supabase.from('deals').update(payload).eq('id', id).select().single());
}

export async function deleteDeal(id: string): Promise<void> {
  unwrap(await supabase.from('deals').delete().eq('id', id));
}

export async function createProjectFromDeal(dealId: string): Promise<Project> {
  const deal = await unwrap(await supabase.from('deals').select('*').eq('id', dealId).single()) as Deal;
  return createProject({ name: deal.title, priority: 5, category: 'client_work', company_id: deal.company_id });
}

// === CRM: Invoices ===

export async function fetchInvoices(params?: { company_id?: string; status?: InvoiceStatus }): Promise<Invoice[]> {
  let q = supabase.from('invoices').select('*').order('created_at', { ascending: false });
  if (params?.company_id) q = q.eq('company_id', params.company_id);
  if (params?.status) q = q.eq('status', params.status);
  return unwrap(await q);
}

export async function fetchCompanyInvoices(companyId: string): Promise<Invoice[]> {
  return unwrap(await supabase.from('invoices').select('*').eq('company_id', companyId).order('created_at', { ascending: false }));
}

export async function createInvoice(payload: Omit<Invoice, 'id' | 'status' | 'paid_date' | 'created_by' | 'created_at'> & { status?: InvoiceStatus }): Promise<Invoice> {
  const userId = await getCurrentUserId();
  return unwrap(await supabase.from('invoices').insert({
    ...payload,
    status: payload.status || 'draft',
    created_by: userId,
  }).select().single());
}

export async function updateInvoice(id: string, payload: Partial<Omit<Invoice, 'id' | 'company_id' | 'created_by' | 'created_at'>>): Promise<Invoice> {
  return unwrap(await supabase.from('invoices').update(payload).eq('id', id).select().single());
}

export async function deleteInvoice(id: string): Promise<void> {
  unwrap(await supabase.from('invoices').delete().eq('id', id));
}

// === Activity / Notifications ===

export async function fetchActivity(limit = 50): Promise<Activity[]> {
  return unwrap(await supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(limit));
}

export async function fetchAudit(limit = 100): Promise<Activity[]> {
  return fetchActivity(limit);
}

export async function fetchNotifications(onlyUnread = false): Promise<Notification[]> {
  let q = supabase.from('notifications').select('*, activity:activities(*)').order('created_at', { ascending: false });
  if (onlyUnread) q = q.is('read_at', null);
  return unwrap(await q);
}

export async function fetchUnreadCount(): Promise<number> {
  const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).is('read_at', null);
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
}

export async function markAllNotificationsRead(): Promise<void> {
  const userId = await getCurrentUserId();
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null);
}

// === Search ===

export async function searchAll(q: string): Promise<SearchResult> {
  const term = `%${q}%`;
  const [boxes, projects, companies, invoices] = await Promise.all([
    supabase.from('boxes').select('id, title, flow_status, project_id').ilike('title', term).limit(10),
    supabase.from('projects').select('id, name, category, status').ilike('name', term).limit(10),
    supabase.from('companies').select('id, name, industry, status').ilike('name', term).limit(10),
    supabase.from('invoices').select('id, invoice_number, title, amount, status, company_id').or(`title.ilike.${term},invoice_number.ilike.${term}`).limit(10),
  ]);
  return {
    boxes: boxes.data ?? [],
    projects: projects.data ?? [],
    companies: companies.data ?? [],
    invoices: invoices.data ?? [],
  };
}

// === Organization ===

export async function fetchOrganization(): Promise<import('../types').OrganizationInfo> {
  const { data } = await supabase.from('organization_info').select('*').limit(1).single();
  if (!data) {
    return unwrap(await supabase.from('organization_info').insert({}).select().single());
  }
  return data as any;
}

export async function updateOrganization(
  payload: Partial<Omit<import('../types').OrganizationInfo, 'id' | 'updated_at'>>,
): Promise<import('../types').OrganizationInfo> {
  const org = await fetchOrganization();
  return unwrap(await supabase.from('organization_info').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', org.id).select().single());
}

// === Dashboard ===

export async function fetchDashboard(): Promise<DashboardResponse> {
  const [projectsRes, boxesRes, usersRes] = await Promise.all([
    supabase.from('projects').select('*').neq('status', 'archived'),
    supabase.from('boxes').select('*'),
    supabase.from('users').select('id, name').eq('is_active', true),
  ]);

  const projects = projectsRes.data ?? [];
  const boxes = boxesRes.data ?? [];
  const users = usersRes.data ?? [];
  const userMap = new Map(users.map((u: any) => [u.id, u.name]));

  const projectStats = projects.map((p: any) => {
    const pBoxes = boxes.filter((b: any) => b.project_id === p.id);
    const counts: Record<string, number> = { wait: 0, working: 0, pickup: 0, blocked: 0, review: 0, done: 0 };
    pBoxes.forEach((b: any) => { counts[b.flow_status] = (counts[b.flow_status] || 0) + 1; });
    const total = pBoxes.length;
    return {
      project_id: p.id, project_name: p.name, priority: p.priority,
      counts, total,
      done_ratio: total ? counts.done / total : 0,
      risk_count: pBoxes.filter((b: any) => b.risk_flag).length,
    };
  });

  const ownerMap = new Map<string, { working: number; pickup: number; blocked: number }>();
  boxes.forEach((b: any) => {
    if (!b.owner_id || !['working', 'pickup', 'blocked'].includes(b.flow_status)) return;
    if (!ownerMap.has(b.owner_id)) ownerMap.set(b.owner_id, { working: 0, pickup: 0, blocked: 0 });
    const o = ownerMap.get(b.owner_id)!;
    if (b.flow_status === 'working') o.working++;
    if (b.flow_status === 'pickup') o.pickup++;
    if (b.flow_status === 'blocked') o.blocked++;
  });

  const owners = Array.from(ownerMap.entries()).map(([id, counts]) => ({
    owner_id: id, owner_name: userMap.get(id) ?? '—', ...counts,
  }));

  return { projects: projectStats, owners } as any;
}

// === Files / Attachments ===

export async function fetchAttachments(targetType: 'box' | 'brief' | 'log', targetId: string): Promise<Attachment[]> {
  return unwrap(await supabase.from('attachments').select('*')
    .eq('target_type', targetType).eq('target_id', targetId)
    .neq('status', 'deleted').order('created_at', { ascending: false }));
}

export async function uploadAttachment(targetType: 'box' | 'brief' | 'log', targetId: string, file: File): Promise<Attachment> {
  const userId = await getCurrentUserId();
  const form = new FormData();
  form.append('target_type', targetType);
  form.append('target_id', targetId);
  form.append('uploaded_by', userId!);
  form.append('file', file);

  const res = await fetch('/api/files/upload', { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function deleteAttachment(id: string): Promise<void> {
  unwrap(await supabase.from('attachments').update({ status: 'deleted' }).eq('id', id));
}

export function downloadUrl(id: string): string {
  return `/api/files/${id}/download`;
}

// === Billing (admin only) ===

export async function fetchBillings(activeOnly = true): Promise<Billing[]> {
  let q = supabase.from('billings').select('*').order('billing_date', { ascending: false });
  if (activeOnly) q = q.eq('is_active', true);
  return unwrap(await q);
}

export async function createBilling(payload: Omit<Billing, 'id' | 'is_active' | 'created_by' | 'created_at'>): Promise<Billing> {
  const userId = await getCurrentUserId();
  return unwrap(await supabase.from('billings').insert({ ...payload, created_by: userId }).select().single());
}

export async function updateBilling(id: string, payload: Partial<Omit<Billing, 'id' | 'created_by' | 'created_at'>>): Promise<Billing> {
  return unwrap(await supabase.from('billings').update(payload).eq('id', id).select().single());
}

export async function deleteBilling(id: string): Promise<void> {
  unwrap(await supabase.from('billings').delete().eq('id', id));
}

export async function fetchPayments(billingId: string): Promise<BillingPayment[]> {
  return unwrap(await supabase.from('billing_payments').select('*').eq('billing_id', billingId).order('paid_date', { ascending: false }));
}

export async function addPayment(billingId: string, payload: { amount: number; paid_date: string; notes?: string }): Promise<BillingPayment> {
  return unwrap(await supabase.from('billing_payments').insert({ billing_id: billingId, ...payload }).select().single());
}

export async function deletePayment(_billingId: string, paymentId: string): Promise<void> {
  unwrap(await supabase.from('billing_payments').delete().eq('id', paymentId));
}

export async function fetchMonthlySummary(year?: number): Promise<MonthlySummary[]> {
  const { data } = await supabase.from('billing_payments').select('amount, paid_date');
  if (!data) return [];

  const map = new Map<string, { total: number; count: number }>();
  data.forEach((p: any) => {
    const month = p.paid_date.substring(0, 7);
    if (year && !month.startsWith(String(year))) return;
    if (!map.has(month)) map.set(month, { total: 0, count: 0 });
    const m = map.get(month)!;
    m.total += p.amount;
    m.count++;
  });

  return Array.from(map.entries())
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

// === Helpers ===

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('id').eq('auth_id', user.id).single();
  return data?.id ?? null;
}
