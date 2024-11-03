/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
        CREATE TABLE FcmToken (
            id int NOT NULL AUTO_INCREMENT,
            userId int NOT NULL,
            fcmToken varchar(255) NOT NULL,
            created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
            lastActive timestamp NULL DEFAULT NULL,
            UNIQUE KEY uk_userId_fcmToken (userId, fcmToken),
            FOREIGN KEY (userId) REFERENCES User (id),
            PRIMARY KEY (id)
        )
    `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('FcmToken');
};
