-- ============================================
-- STEP 2: Run this AFTER Step 1 (insert data)
-- ============================================

INSERT IGNORE INTO admin (username, password) VALUES ('admin', '$2b$10$B1yiq23cxUiQEAJ/eZFpxeWCjk4a/wpFgNlDP5EAODcgcrF4KfwXe');

INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('newsTicker', 'नवीन अपडेट: बिरदेव जयंती २०२६ ची तयारी सुरू झाली आहे!');
