/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table("song_metadata", (table) => {
    table.dropColumn("title");
    table.dropColumn("author");

    table.string("yt_title", 1024);
    table.string("yt_author", 1024);
    table.string("spotify_title", 1024);
    table.string("spotify_author", 1024);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {};
