/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
        CREATE TABLE User (
            id int NOT NULL AUTO_INCREMENT,
            sharetribeUUID varchar(255) NOT NULL,
            UNIQUE KEY uk_uuid (sharetribeUUID),
            PRIMARY KEY (id)
        )
    `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('User');
};
