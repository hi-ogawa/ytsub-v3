CREATE TABLE `userVerifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `userId` bigint NOT NULL,
  `email` varchar(128) NOT NULL,
  `code` varchar(128) NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `verifiedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
