
-- Users can read and update their own row
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Tools are readable by all authenticated users
CREATE POLICY "tools_select_auth" ON tools FOR SELECT USING (auth.role() = 'authenticated');

-- Clubs readable by all authenticated users
CREATE POLICY "clubs_select_auth" ON clubs FOR SELECT USING (auth.role() = 'authenticated');

-- Lab sessions: own rows only
CREATE POLICY "sessions_select_own" ON lab_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON lab_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON lab_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Events: all authenticated users can read
CREATE POLICY "events_select_auth" ON events FOR SELECT USING (auth.role() = 'authenticated');

-- RSVPs: own rows
CREATE POLICY "rsvps_select_own" ON rsvps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rsvps_insert_own" ON rsvps FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Projects: public ones visible to all, private to creator
CREATE POLICY "projects_select_public" ON projects FOR SELECT USING (visibility = 'public' OR auth.uid() = created_by);
CREATE POLICY "projects_insert_auth" ON projects FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Project members: own rows + project admins
CREATE POLICY "members_select_own" ON project_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "members_insert_auth" ON project_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bookings: own rows
CREATE POLICY "bookings_select_own" ON tool_bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bookings_insert_own" ON tool_bookings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications: own only
CREATE POLICY "notif_select_own" ON notifications FOR SELECT USING (auth.uid() = user_id);

-- Knowledge articles: readable by all auth, insertable by author
CREATE POLICY "articles_select_auth" ON knowledge_articles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "articles_insert_auth" ON knowledge_articles FOR INSERT WITH CHECK (auth.uid() = author_id);
