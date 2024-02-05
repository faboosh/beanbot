/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("plays", (table) => {
    table.increments("id").primary().unique();
    table.string("title", 1024);
    table.string("yt_id", 1024);
    table.string("filename", 1024);
    table.bigInteger("timestamp");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("plays");
};
