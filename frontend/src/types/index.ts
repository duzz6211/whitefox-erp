export type FlowStatus = 'wait' | 'working' | 'pickup' | 'blocked' | 'review' | 'done';
export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  job_title: string | null;
  is_active: boolean;
  created_at: string;
}

export type ProjectCategory =
  | 'product'
  | 'client_work'
  | 'internal_ops'
  | 'marketing'
  | 'design'
  | 'research'
  | 'client'
  | 'internal';

export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  product: '프로덕트',
  client_work: '클라이언트 작업',
  internal_ops: '내부 운영',
  marketing: '마케팅',
  design: '디자인',
  research: '리서치',
  client: '클라이언트',
  internal: '내부',
};

export interface Project {
  id: string;
  name: string;
  priority: number;
  category: ProjectCategory;
  status: 'active' | 'completed' | 'archived';
  company_id: string | null;
  created_at: string;
}

export type CompanyStatus = 'active' | 'lost' | 'archived';
export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export const DEAL_STAGES: DealStage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  lead: '리드',
  qualified: '검증됨',
  proposal: '제안',
  negotiation: '협상',
  won: '성사',
  lost: '실패',
};

export const DEAL_STAGE_COLORS: Record<DealStage, string> = {
  lead: 'bg-slate-100 border-slate-300',
  qualified: 'bg-blue-50 border-blue-300',
  proposal: 'bg-amber-50 border-amber-300',
  negotiation: 'bg-purple-50 border-purple-300',
  won: 'bg-emerald-50 border-emerald-300',
  lost: 'bg-rose-50 border-rose-300',
};

export interface Company {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  notes: string;
  status: CompanyStatus;
  created_at: string;
}

export interface Contact {
  id: string;
  company_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  notes: string;
  created_at: string;
}

export interface Deal {
  id: string;
  company_id: string;
  title: string;
  amount: number | null;
  stage: DealStage;
  expected_close_date: string | null;
  owner_id: string | null;
  notes: string;
  created_at: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';

export const INVOICE_STATUSES: InvoiceStatus[] = ['draft', 'sent', 'paid', 'overdue', 'void'];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: '초안',
  sent: '발송됨',
  paid: '입금 완료',
  overdue: '연체',
  void: '취소',
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-rose-100 text-rose-700',
  void: 'bg-slate-200 text-slate-500',
};

export interface Invoice {
  id: string;
  company_id: string;
  deal_id: string | null;
  invoice_number: string;
  title: string;
  amount: number;
  status: InvoiceStatus;
  issued_date: string;
  due_date: string | null;
  paid_date: string | null;
  notes: string;
  created_by: string;
  created_at: string;
}

export type ActivityType =
  | 'box_created' | 'box_transitioned' | 'box_picked_up' | 'box_reassigned'
  | 'box_deleted' | 'box_risk_flagged'
  | 'project_created' | 'project_completed' | 'project_archived'
  | 'brief_updated'
  | 'company_created' | 'deal_created' | 'deal_stage_changed'
  | 'invoice_created' | 'invoice_status_changed' | 'invoice_deleted'
  | 'member_invited' | 'member_deactivated';

export type SubjectType = 'box' | 'project' | 'brief' | 'company' | 'deal' | 'invoice' | 'user';

export interface Activity {
  id: string;
  actor_id: string | null;
  type: ActivityType;
  subject_type: SubjectType;
  subject_id: string;
  summary: string;
  meta: Record<string, any> | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  activity: Activity;
  read_at: string | null;
  created_at: string;
}

export interface SearchResult {
  boxes: { id: string; title: string; flow_status: string; project_id: string }[];
  projects: { id: string; name: string; category: string; status: string }[];
  companies: { id: string; name: string; industry: string | null; status: string }[];
  invoices: { id: string; invoice_number: string; title: string; amount: number; status: string; company_id: string }[];
}

export interface OrganizationInfo {
  id: string;
  business_name: string;
  representative_name: string;
  business_number: string;
  corporate_number: string;
  business_type: string;
  business_item: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  established_date: string | null;
  notes: string;
  updated_at: string;
}

export interface Box {
  id: string;
  project_id: string;
  owner_id: string | null;
  title: string;
  flow_status: FlowStatus;
  deadline: string | null;
  risk_flag: boolean;
  week_number: number | null;
  status_changed_at: string;
  created_at: string;
}

export interface AsyncLog {
  id: string;
  box_id: string;
  author_id: string;
  content: string;
  log_type: 'work' | 'comment' | 'system';
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ContextCard {
  id: string;
  box_id: string;
  why: string;
  success_criteria: string;
  decision_history: string;
  updated_at: string;
}

export interface PickupRecord {
  id: string;
  box_id: string;
  completed_by: string;
  picked_by: string;
  note: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  target_type: 'brief' | 'box' | 'log';
  target_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  status: 'pending' | 'confirmed' | 'deleted';
  uploaded_by: string;
  confirmed_at: string | null;
  created_at: string;
}

// === Billing ===

export type BillingCategory = 'subscription' | 'infra' | 'tool' | 'service' | 'other';
export type BillingCycle = 'monthly' | 'yearly' | 'one_time';

export const BILLING_CATEGORY_LABELS: Record<BillingCategory, string> = {
  subscription: '구독',
  infra: '인프라',
  tool: '도구',
  service: '서비스',
  other: '기타',
};

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: '월간',
  yearly: '연간',
  one_time: '1회성',
};

export interface Billing {
  id: string;
  name: string;
  category: BillingCategory;
  amount: number;
  cycle: BillingCycle;
  billing_date: string;
  next_billing_date: string | null;
  vendor: string;
  notes: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface BillingPayment {
  id: string;
  billing_id: string;
  amount: number;
  paid_date: string;
  notes: string;
  created_at: string;
}

export interface MonthlySummary {
  month: string;
  total: number;
  count: number;
}

export interface DashboardResponse {
  projects: {
    project_id: string;
    project_name: string;
    priority: number;
    counts: Record<FlowStatus, number>;
    total: number;
    done_ratio: number;
    risk_count: number;
  }[];
  owners: {
    owner_id: string;
    owner_name: string;
    working: number;
    pickup: number;
    blocked: number;
  }[];
}

export const FLOW_STATUSES: FlowStatus[] = ['wait', 'working', 'pickup', 'blocked', 'review', 'done'];

export const FLOW_STATUS_LABELS: Record<FlowStatus, string> = {
  wait: '대기',
  working: '작업중',
  pickup: '픽업 대기',
  blocked: '외부 대기',
  review: '검토',
  done: '완료',
};

export const FLOW_STATUS_COLORS: Record<FlowStatus, string> = {
  wait: 'bg-slate-100 border-slate-300',
  working: 'bg-blue-50 border-blue-300',
  pickup: 'bg-amber-50 border-amber-300',
  blocked: 'bg-rose-50 border-rose-300',
  review: 'bg-purple-50 border-purple-300',
  done: 'bg-emerald-50 border-emerald-300',
};
