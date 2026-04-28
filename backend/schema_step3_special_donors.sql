-- ============================================
-- STEP 3: Add special_donors table for विशेष सहकार्य
-- ============================================

CREATE TABLE IF NOT EXISTS special_donors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
