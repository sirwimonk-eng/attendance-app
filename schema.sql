-- -------------------------------------------------------------
-- SQL Schema Definition for the Thai Military Time Management System
-- ระบบสารสนเทศการจัดการเวลาปฏิบัติงานและการเข้าแถวของกำลังพล
-- -------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS `military_attendance_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_thai_520_w2;
USE `military_attendance_db`;

-- 1. Table schema: Users
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `rank` VARCHAR(100) NOT NULL,
  `role` ENUM('ผู้บังคับบัญชา', 'เจ้าหน้าที่ธุรการ', 'ข้าราชการ') NOT NULL DEFAULT 'ข้าราชการ',
  `status` ENUM('มา', 'สาย', 'ขาด', 'ลา') NOT NULL DEFAULT 'ขาด',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- Seed initial master accounts
INSERT INTO `users` (`id`, `username`, `password`, `name`, `rank`, `role`, `status`) VALUES
(1, 'commander', 'password123', 'สมเจตน์ เก่งกาจ', 'พันโท (พ.ท.)', 'ผู้บังคับบัญชา', 'มา'),
(2, 'admin', 'password123', 'สมพงษ์ ทำงานดี', 'จ่าสิบเอก (จ.ส.о.)', 'เจ้าหน้าที่ธุรการ', 'มา'),
(3, 'officer1', 'password123', 'รักชาติ ยิ่งชีพ', 'สิบเอก (ส.อ.)', 'ข้าราชการ', 'มา');

-- 2. Table schema: Personnel (Detail extensions)
CREATE TABLE IF NOT EXISTS `personnel` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `rank` VARCHAR(50) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ขาด',
  `phone` VARCHAR(15) NULL,
  `email` VARCHAR(100) NULL,
  `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- 3. Table schema: Attendance logs
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `username` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `rank` VARCHAR(100) NOT NULL,
  `time` TIME NOT NULL,
  `date` DATE NOT NULL,
  `type` ENUM('checkin', 'checkout') NOT NULL,
  `status` ENUM('มา', 'สาย', 'ขาด', 'ลา') NOT NULL,
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `distance` DECIMAL(10, 2) NOT NULL COMMENT 'Distance in meters from central assembly',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;

-- 4. Table schema: Face Biometric data (Face Descriptors)
CREATE TABLE IF NOT EXISTS `face_data` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `descriptor` TEXT NOT NULL COMMENT 'JSON array mapping 128 dynamic floating point vectors',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_thai_520_w2;
