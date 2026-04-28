CREATE DATABASE IF NOT EXISTS birdev_dengi;
USE birdev_dengi;

CREATE TABLE IF NOT EXISTS admin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- Insert a default admin (password is 'admin123' hashed with bcrypt)
-- You can generate a new hash using bcrypt if you want to change it.
-- This hash is for 'admin123'
INSERT IGNORE INTO admin (username, password) VALUES ('admin', '$2b$10$B1yiq23cxUiQEAJ/eZFpxeWCjk4a/wpFgNlDP5EAODcgcrF4KfwXe');

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
    photoUrl VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS special_donors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO settings (setting_key, setting_value) VALUES ('newsTicker', 'नवीन अपडेट: बिरदेव जयंती २०२४ ची तयारी सुरू झाली आहे!');

