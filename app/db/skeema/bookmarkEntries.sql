CREATE TABLE `bookmarkEntries` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `text` text NOT NULL,
  `side` int NOT NULL,
  `offset` int NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `userId` bigint NOT NULL,
  `videoId` bigint NOT NULL,
  `captionEntryId` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `bookmarkEntries_userId_createdAt_key` (`userId`,`createdAt`),
  KEY `bookmarkEntries_videoId_key` (`videoId`),
  KEY `bookmarkEntries_captionEntryId_key` (`captionEntryId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
