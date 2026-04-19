-- ============================================================
-- RLS 활성화 및 정책 설정
-- ============================================================

-- ── users ──
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_update_self" ON users FOR UPDATE TO authenticated
  USING (auth_id = auth.uid());
CREATE POLICY "users_update_admin" ON users FOR UPDATE TO authenticated
  USING (is_admin());
CREATE POLICY "users_insert_admin" ON users FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- ── projects ──
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated USING (is_admin());

-- ── boxes ──
ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boxes_select" ON boxes FOR SELECT TO authenticated USING (true);
CREATE POLICY "boxes_insert" ON boxes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "boxes_update" ON boxes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "boxes_delete" ON boxes FOR DELETE TO authenticated USING (is_admin());

-- ── context_cards ──
ALTER TABLE context_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cc_select" ON context_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "cc_insert" ON context_cards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cc_update" ON context_cards FOR UPDATE TO authenticated USING (true);

-- ── async_logs (append-only) ──
ALTER TABLE async_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs_select" ON async_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "logs_insert" ON async_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ── pickup_records ──
ALTER TABLE pickup_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pickups_select" ON pickup_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "pickups_insert" ON pickup_records FOR INSERT TO authenticated WITH CHECK (true);

-- ── project_briefs ──
ALTER TABLE project_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "briefs_select" ON project_briefs FOR SELECT TO authenticated USING (true);
CREATE POLICY "briefs_insert" ON project_briefs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "briefs_update" ON project_briefs FOR UPDATE TO authenticated USING (true);

-- ── brief_versions ──
ALTER TABLE brief_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bv_select" ON brief_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "bv_insert" ON brief_versions FOR INSERT TO authenticated WITH CHECK (true);

-- ── attachments ──
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_select" ON attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "att_insert" ON attachments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "att_update" ON attachments FOR UPDATE TO authenticated
  USING (uploaded_by = get_my_user_id() OR is_admin());
CREATE POLICY "att_delete" ON attachments FOR DELETE TO authenticated
  USING (uploaded_by = get_my_user_id() OR is_admin());

-- ── companies ──
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_select" ON companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "companies_insert" ON companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "companies_update" ON companies FOR UPDATE TO authenticated USING (true);
CREATE POLICY "companies_delete" ON companies FOR DELETE TO authenticated USING (is_admin());

-- ── contacts ──
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_select" ON contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "contacts_insert" ON contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "contacts_update" ON contacts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "contacts_delete" ON contacts FOR DELETE TO authenticated USING (true);

-- ── deals ──
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deals_select" ON deals FOR SELECT TO authenticated USING (true);
CREATE POLICY "deals_insert" ON deals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "deals_update" ON deals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "deals_delete" ON deals FOR DELETE TO authenticated USING (true);

-- ── invoices ──
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_select" ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "invoices_insert" ON invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "invoices_update" ON invoices FOR UPDATE TO authenticated USING (true);
CREATE POLICY "invoices_delete" ON invoices FOR DELETE TO authenticated USING (is_admin());

-- ── activities ──
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities_select" ON activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "activities_insert" ON activities FOR INSERT TO authenticated WITH CHECK (true);

-- ── notifications ──
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select" ON notifications FOR SELECT TO authenticated
  USING (user_id = get_my_user_id());
CREATE POLICY "notif_update" ON notifications FOR UPDATE TO authenticated
  USING (user_id = get_my_user_id());
CREATE POLICY "notif_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

-- ── organization_info ──
ALTER TABLE organization_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON organization_info FOR SELECT TO authenticated USING (true);
CREATE POLICY "org_update" ON organization_info FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "org_insert" ON organization_info FOR INSERT TO authenticated WITH CHECK (is_admin());

-- ── billings (admin only) ──
ALTER TABLE billings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billings_all" ON billings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ── billing_payments (admin only) ──
ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bp_all" ON billing_payments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
