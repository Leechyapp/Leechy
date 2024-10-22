/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.raw(`
        ALTER TABLE Follows ADD CONSTRAINT fk_followedUserId FOREIGN KEY (followedUserId) REFERENCES User(id);
    `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.raw(`
        ALTER TABLE Follows DROP FOREIGN KEY fk_followedUserId;
    `);
};
