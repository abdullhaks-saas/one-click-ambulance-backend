-- Phase 1 tables: driver_documents, driver_bank_accounts, ambulances, ambulance_types, ambulance_equipment
-- Run this script against your MySQL database (e.g. oneclick_db) when tables don't exist yet.

-- driver_documents
CREATE TABLE IF NOT EXISTS `driver_documents` (
  `id` char(36) NOT NULL,
  `driver_id` char(36) NOT NULL,
  `document_type` enum('license','rc','insurance','pan','aadhaar') NOT NULL,
  `document_url` varchar(500) NOT NULL,
  `verification_status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_driver_documents_driver_id` (`driver_id`),
  CONSTRAINT `FK_driver_documents_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- driver_bank_accounts
CREATE TABLE IF NOT EXISTS `driver_bank_accounts` (
  `id` char(36) NOT NULL,
  `driver_id` char(36) NOT NULL,
  `bank_name` varchar(255) NOT NULL,
  `account_number` varchar(255) NOT NULL,
  `ifsc_code` varchar(50) NOT NULL,
  `account_holder_name` varchar(255) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_driver_bank_accounts_driver_id` (`driver_id`),
  CONSTRAINT `FK_driver_bank_accounts_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ambulance_types (lookup table, run first if ambulances depend on it)
CREATE TABLE IF NOT EXISTS `ambulance_types` (
  `id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_ambulance_types_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ambulances
CREATE TABLE IF NOT EXISTS `ambulances` (
  `id` char(36) NOT NULL,
  `driver_id` char(36) NOT NULL,
  `ambulance_type_id` char(36) NOT NULL,
  `registration_number` varchar(50) NOT NULL,
  `vehicle_number` varchar(50) DEFAULT NULL,
  `photo_url` varchar(500) DEFAULT NULL,
  `insurance_expiry` date DEFAULT NULL,
  `status` enum('pending','approved','suspended') NOT NULL DEFAULT 'pending',
  `suspend_reason` varchar(500) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_ambulances_driver_id` (`driver_id`),
  KEY `IDX_ambulances_ambulance_type_id` (`ambulance_type_id`),
  CONSTRAINT `FK_ambulances_driver` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_ambulances_type` FOREIGN KEY (`ambulance_type_id`) REFERENCES `ambulance_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ambulance_equipment
CREATE TABLE IF NOT EXISTS `ambulance_equipment` (
  `id` char(36) NOT NULL,
  `ambulance_id` char(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_ambulance_equipment_ambulance_id` (`ambulance_id`),
  CONSTRAINT `FK_ambulance_equipment_ambulance` FOREIGN KEY (`ambulance_id`) REFERENCES `ambulances` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
