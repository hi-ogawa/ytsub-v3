CREATE TABLE `captionEntries` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `index` int NOT NULL,
  `begin` float NOT NULL,
  `end` float NOT NULL,
  `text1` text NOT NULL,
  `text2` text NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `videoId` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `captionEntries_videoId_key` (`videoId`),
  KEY `captionEntries_videoId_index_key` (`videoId`,`index`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
