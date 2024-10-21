use Leechy;

DROP TABLE IF EXISTS User;

CREATE TABLE User (
    id int NOT NULL AUTO_INCREMENT,
    sharetribeUUID varchar(255) NOT NULL,
    UNIQUE KEY uk_uuid (sharetribeUUID),
    PRIMARY KEY (id)
);

DROP TABLE IF EXISTS Follows;

CREATE TABLE Follows (
    id int NOT NULL AUTO_INCREMENT,
    followedUserId int NOT NULL,
    followingUserId int NOT NULL,
    created datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_followedUserId_followingUserId (followedUserId, followingUserId),
    PRIMARY KEY (id)
);