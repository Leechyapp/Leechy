/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
        CREATE TABLE Follows (
            id int NOT NULL AUTO_INCREMENT,
            followedUserId int NOT NULL,
            followingUserId int NOT NULL,
            created datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_followedUserId_followingUserId (followedUserId, followingUserId),
            PRIMARY KEY (id)
        )
    `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('Follows');
};
