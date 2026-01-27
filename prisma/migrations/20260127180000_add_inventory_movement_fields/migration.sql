-- AlterTable InventoryMovement: Add missing fields
ALTER TABLE `InventoryMovement` ADD COLUMN `description` VARCHAR(191) NULL;
ALTER TABLE `InventoryMovement` ADD COLUMN `reason` VARCHAR(191) NULL;
ALTER TABLE `InventoryMovement` ADD COLUMN `notes` VARCHAR(191) NULL;
ALTER TABLE `InventoryMovement` ADD COLUMN `scannedCode` VARCHAR(191) NULL;
ALTER TABLE `InventoryMovement` ADD COLUMN `oldStock` INTEGER NULL;
ALTER TABLE `InventoryMovement` ADD COLUMN `newStock` INTEGER NULL;