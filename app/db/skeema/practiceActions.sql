CREATE TABLE `practiceActions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `queueType` varchar(32) NOT NULL,
  `actionType` varchar(32) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `userId` bigint NOT NULL,
  `deckId` bigint NOT NULL,
  `practiceEntryId` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `practiceActions_userId_key` (`userId`),
  KEY `practiceActions_deckId_key` (`deckId`),
  KEY `practiceActions_practiceEntryId_key` (`practiceEntryId`),
  KEY `practiceActions_createdAt_key` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
