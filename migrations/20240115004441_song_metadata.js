/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("song_metadata", (table) => {
    table.increments("id").primary().unique();
    table.string("yt_id", 64);
    table.float("length_seconds");
    table.float("volume_multiplier").defaultTo(0);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {};
