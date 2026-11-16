import type { EnrichedMedia, TmdbDetails, Ratings } from "@cineblaze/shared";

export const sampleEnrichedMedia: EnrichedMedia = {
  id: 157336,
  title: "Interstellar",
  media_type: "movie",
  poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  release_date: "2014-11-05",
  overview:
    "The adventures of a group of explorers who make use of a newly discovered wormhole.",
  vote_average: 8.4,
  genres: ["Adventure", "Drama", "Science Fiction"],
  cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"],
  director: "Christopher Nolan",
  imdb_rating: "8.7",
  rotten_tomatoes: "73%",
  imdb_id: "tt0816692",
  providers: [
    {
      name: "Netflix",
      logo: "https://image.tmdb.org/t/p/original/pbpMk2JmcoNnQwx5JGpXngfoWtp.jpg",
      link: "https://www.netflix.com/title/70305903",
    },
  ],
};

export const sampleTmdbDetails: TmdbDetails = {
  director: "Christopher Nolan",
  cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"],
  genres: ["Adventure", "Drama", "Science Fiction"],
};

export const sampleRatings: Ratings = {
  imdb: "8.7",
  rt: "73%",
  imdbId: "tt0816692",
};
