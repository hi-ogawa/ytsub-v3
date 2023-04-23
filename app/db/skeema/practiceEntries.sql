CREATE TABLE `practiceEntries` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `queueType` varchar(32) NOT NULL,
  `easeFactor` float NOT NULL,
  `scheduledAt` datetime NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deckId` bigint NOT NULL,
  `bookmarkEntryId` bigint NOT NULL,
  `practiceActionsCount` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `practiceEntries_deckId_scheduledAt_key` (`deckId`, `scheduledAt`),
  KEY `practiceEntries_bookmarkEntry_key` (`bookmarkEntryId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
