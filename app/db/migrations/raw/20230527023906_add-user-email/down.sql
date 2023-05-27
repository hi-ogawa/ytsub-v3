DROP TABLE `userVerifications`;

ALTER TABLE `users` DROP COLUMN `email`, DROP KEY `email`;
