/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("skips", (table) => {
    table.increments("id").primary().unique();
    table.string("yt_id", 1024);
    table.string("guild_id", 1024);
    table.bigInteger("timestamp");
    table.string("user_id", 1024);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {};
