-- ============================================
-- STEP 1: Run this FIRST (all CREATE TABLEs)
-- ============================================

CREATE TABLE IF NOT EXISTS admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    isPaid BOOLEAN DEFAULT FALSE,
    paymentMode ENUM('Cash', 'Online') NULL,
    date DATE NULL,
    surnameCategory VARCHAR(100) NOT NULL,
    eventName VARCHAR(100) DEFAULT 'बिरदेव जयंती २०२४'
);

CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS surnames (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

    CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value TEXT
    );

CREATE TABLE IF NOT EXISTS committee (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role VARCHAR(100),
    name VARCHAR(100),
    photoUrl VARCHAR(500)
);
