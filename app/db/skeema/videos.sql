CREATE TABLE `videos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `videoId` varchar(32) NOT NULL,
  `language1_id` varchar(32) NOT NULL,
  `language1_translation` varchar(32) DEFAULT NULL,
  `language2_id` varchar(32) NOT NULL,
  `language2_translation` varchar(32) DEFAULT NULL,
  `title` text NOT NULL,
  `author` text NOT NULL,
  `channelId` varchar(32) NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `userId` bigint DEFAULT NULL,
  `bookmarkEntriesCount` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `videoId` (`videoId`,`language1_id`,`language1_translation`,`language2_id`,`language2_translation`,`userId`),
  KEY `videos_userId_key` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
