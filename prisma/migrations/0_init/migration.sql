-- CreateTable
CREATE TABLE `bookmarkEntries` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `text` TEXT NOT NULL,
    `side` INTEGER NOT NULL,
    `offset` INTEGER NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `userId` BIGINT NOT NULL,
    `videoId` BIGINT NOT NULL,
    `captionEntryId` BIGINT NOT NULL,

    INDEX `bookmarkEntries_captionEntryId_key`(`captionEntryId`),
    INDEX `bookmarkEntries_userId_key`(`userId`),
    INDEX `bookmarkEntries_videoId_key`(`videoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `captionEntries` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `index` INTEGER NOT NULL,
    `begin` FLOAT NOT NULL,
    `end` FLOAT NOT NULL,
    `text1` TEXT NOT NULL,
    `text2` TEXT NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `videoId` BIGINT NOT NULL,

    INDEX `captionEntries_videoId_key`(`videoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `decks` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` TEXT NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `userId` BIGINT NOT NULL,
    `newEntriesPerDay` INTEGER NOT NULL DEFAULT 50,
    `reviewsPerDay` INTEGER NOT NULL DEFAULT 200,
    `easeMultiplier` FLOAT NOT NULL DEFAULT 2,
    `easeBonus` FLOAT NOT NULL DEFAULT 1.5,
    `randomMode` BOOLEAN NOT NULL DEFAULT false,
    `practiceEntriesCountByQueueType` JSON NOT NULL,

    INDEX `decks_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knex_migrations` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NULL,
    `batch` INTEGER NULL,
    `migration_time` TIMESTAMP(0) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `knex_migrations_lock` (
    `index` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `is_locked` INTEGER NULL,

    PRIMARY KEY (`index`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `practiceActions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `queueType` VARCHAR(32) NOT NULL,
    `actionType` VARCHAR(32) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `userId` BIGINT NOT NULL,
    `deckId` BIGINT NOT NULL,
    `practiceEntryId` BIGINT NOT NULL,

    INDEX `practiceActions_createdAt_key`(`createdAt`),
    INDEX `practiceActions_deckId_key`(`deckId`),
    INDEX `practiceActions_practiceEntryId_key`(`practiceEntryId`),
    INDEX `practiceActions_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `practiceEntries` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `queueType` VARCHAR(32) NOT NULL,
    `easeFactor` FLOAT NOT NULL,
    `scheduledAt` DATETIME(0) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deckId` BIGINT NOT NULL,
    `bookmarkEntryId` BIGINT NOT NULL,
    `practiceActionsCount` INTEGER NOT NULL DEFAULT 0,

    INDEX `practiceEntries_bookmarkEntry_key`(`bookmarkEntryId`),
    INDEX `practiceEntries_deckId_key`(`deckId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(128) NOT NULL,
    `passwordHash` VARCHAR(128) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `language1` VARCHAR(32) NULL,
    `language2` VARCHAR(32) NULL,
    `timezone` VARCHAR(32) NOT NULL DEFAULT '+00:00',

    UNIQUE INDEX `username`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `videos` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `videoId` VARCHAR(32) NOT NULL,
    `language1_id` VARCHAR(32) NOT NULL,
    `language1_translation` VARCHAR(32) NULL,
    `language2_id` VARCHAR(32) NOT NULL,
    `language2_translation` VARCHAR(32) NULL,
    `title` TEXT NOT NULL,
    `author` TEXT NOT NULL,
    `channelId` VARCHAR(32) NOT NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `userId` BIGINT NULL,
    `bookmarkEntriesCount` INTEGER NOT NULL DEFAULT 0,

    INDEX `videos_userId_key`(`userId`),
    UNIQUE INDEX `videoId`(`videoId`, `language1_id`, `language1_translation`, `language2_id`, `language2_translation`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

