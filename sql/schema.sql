CREATE TABLE IF NOT EXISTS `parking_vehicles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `plate` VARCHAR(8) NOT NULL,
  `owner` VARCHAR(50) NOT NULL,
  `model` VARCHAR(50) NOT NULL,
  `stored` VARCHAR(50) NOT NULL DEFAULT 'stored',
  PRIMARY KEY (`id`),
  UNIQUE KEY `plate` (`plate`),
  KEY `parking_vehicles_owner_key` (`owner`)
);
