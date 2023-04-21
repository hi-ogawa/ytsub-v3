CREATE TABLE `decks` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `userId` bigint NOT NULL,
  `newEntriesPerDay` int NOT NULL DEFAULT '50',
  `reviewsPerDay` int NOT NULL DEFAULT '200',
  `easeMultiplier` float NOT NULL DEFAULT '2',
  `easeBonus` float NOT NULL DEFAULT '1.5',
  `randomMode` tinyint(1) NOT NULL DEFAULT '0',
  `practiceEntriesCountByQueueType` json NOT NULL DEFAULT (json_object(_utf8mb4'NEW',0,_utf8mb4'LEARN',0,_utf8mb4'REVIEW',0)),
  PRIMARY KEY (`id`),
  KEY `decks_userId_key` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
