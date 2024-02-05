/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.up = function (knex) {
  return (
    knex.schema
      // Creating the Songs table
      .alterTable("song_metadata", (table) => {
        table.integer("tempo");
        table.string("key");
      })
      // Creating the Genres table
      .createTable("genres", (table) => {
        table.increments("id").primary();
        table.string("name").unique();
      })
      // Creating the Moods table
      .createTable("moods", (table) => {
        table.increments("id").primary();
        table.string("name").unique();
      })
      // Creating the SongGenres table
      .createTable("song_genres", (table) => {
        table.integer("song_id").unsigned().notNullable();
        table.integer("genre_id").unsigned().notNullable();
        table.foreign("song_id").references("songs.id");
        table.foreign("genre_id").references("genres.id");
        table.primary(["song_id", "genre_id"]);
      })
      // Creating the SongMoods table
      .createTable("song_moods", (table) => {
        table.integer("song_id").unsigned().notNullable();
        table.integer("mood_id").unsigned().notNullable();
        table.foreign("song_id").references("songs.id");
        table.foreign("mood_id").references("moods.id");
        table.primary(["song_id", "mood_id"]);
      })
  );
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("song_moods")
    .dropTableIfExists("song_genres")
    .dropTableIfExists("moods")
    .dropTableIfExists("genres");
};
