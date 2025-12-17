-- AlterTable Product: Add missing fields
ALTER TABLE `Product` ADD COLUMN `description` VARCHAR(191) NULL;
ALTER TABLE `Product` ADD COLUMN `brand` VARCHAR(191) NULL;
ALTER TABLE `Product` ADD COLUMN `tags` VARCHAR(191) NULL;
ALTER TABLE `Product` ADD COLUMN `cost` DOUBLE NULL DEFAULT 0;
ALTER TABLE `Product` ADD COLUMN `minStock` INTEGER NULL DEFAULT 5;
ALTER TABLE `Product` ADD COLUMN `maxStock` INTEGER NULL DEFAULT 1000;
ALTER TABLE `Product` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `Product` ADD COLUMN `allowNegativeStock` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `Product` ADD COLUMN `trackSerial` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `Product` ADD COLUMN `notes` VARCHAR(191) NULL;
ALTER TABLE `Product` ADD COLUMN `warningNotes` VARCHAR(191) NULL;
ALTER TABLE `Product` ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- AlterEnum User role: Add auditor role
ALTER TABLE `User` MODIFY `role` ENUM('admin', 'usuario', 'auditor') NOT NULL DEFAULT 'usuario';

-- AlterEnum InventoryMovement: Update movement types
ALTER TABLE `InventoryMovement` MODIFY `movementType` ENUM('ENTRADA', 'SALIDA', 'AJUSTE', 'TRANSFERENCIA') NOT NULL;

-- CreateTable AuditLog: Create audit_logs table for logging
CREATE TABLE `audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT') NOT NULL,
    `entity` ENUM('USER', 'PRODUCT', 'CATEGORY', 'INVENTORY', 'MOVEMENT') NOT NULL,
    `entityId` BIGINT NULL,
    `entityName` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `userId` INTEGER NOT NULL,
    `userName` VARCHAR(191) NOT NULL,
    `userRole` ENUM('admin', 'usuario', 'auditor') NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `details` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,

    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_entity_idx`(`entity`),
    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_timestamp_idx`(`timestamp`),
    INDEX `audit_logs_entity_entityId_idx`(`entity`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;