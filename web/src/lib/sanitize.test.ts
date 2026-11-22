import { describe, it, expect } from "vitest";
import {
  isInTheatres,
  isUpcomingMovie,
  isUpcoming,
  releaseYear,
  displayRating,
  formatRuntime,
  formatSeasons,
  sanitizeMedia,
} from "./sanitize";

describe("sanitize utilities", () => {
  const fixedNow = new Date("2026-11-22T12:00:00Z").getTime();

  describe("isUpcomingMovie", () => {
    it("returns true for a movie with a future release date (e.g. Avengers: Doomsday)", () => {
      const movie = {
        media_type: "movie" as const,
        release_date: "2026-12-18",
        providers: [],
      };
      expect(isUpcomingMovie(movie, fixedNow)).toBe(true);
      expect(isUpcoming(movie, fixedNow)).toBe(true);
    });

    it("returns true for a movie with a future year string", () => {
      const movie = {
        media_type: "movie" as const,
        release_date: "2027",
        providers: [],
      };
      expect(isUpcomingMovie(movie, fixedNow)).toBe(true);
    });

    it("returns false for a movie released in the past", () => {
      const movie = {
        media_type: "movie" as const,
        release_date: "2026-10-01",
        providers: [],
      };
      expect(isUpcomingMovie(movie, fixedNow)).toBe(false);
    });

    it("returns false for a movie released in a past year", () => {
      const movie = {
        media_type: "movie" as const,
        release_date: "2024",
        providers: [],
      };
      expect(isUpcomingMovie(movie, fixedNow)).toBe(false);
    });

    it("returns false for TV series even if first_air_date is in the future", () => {
      const tvShow = {
        media_type: "tv" as const,
        release_date: "2026-12-25",
        providers: [],
      };
      expect(isUpcomingMovie(tvShow, fixedNow)).toBe(false);
    });

    it("returns false if subscription streaming is already available", () => {
      const movie = {
        media_type: "movie" as const,
        release_date: "2026-12-18",
        providers: [
          {
            name: "Netflix",
            logo: "/netflix.jpg",
            type: "flatrate" as const,
          },
        ],
      };
      expect(isUpcomingMovie(movie, fixedNow)).toBe(false);
    });

    it("returns false when release date is missing or invalid", () => {
      expect(
        isUpcomingMovie(
          { media_type: "movie", release_date: "", providers: [] },
          fixedNow
        )
      ).toBe(false);

      expect(
        isUpcomingMovie(
          { media_type: "movie", release_date: "invalid-date", providers: [] },
          fixedNow
        )
      ).toBe(false);
    });
  });

  describe("isInTheatres", () => {
    it("returns true for a movie released within 45 days and without streaming", () => {
      const movie = {
        media_type: "movie" as const,
        release_date: "2026-11-10",
        providers: [],
      };
      expect(isInTheatres(movie, fixedNow)).toBe(true);
    });

    it("returns false for an upcoming movie", () => {
      const movie = {
        media_type: "movie" as const,
        release_date: "2026-12-18",
        providers: [],
      };
      expect(isInTheatres(movie, fixedNow)).toBe(false);
    });

    it("returns false for a movie released more than 45 days ago", () => {
      const movie = {
        media_type: "movie" as const,
        release_date: "2026-08-01",
        providers: [],
      };
      expect(isInTheatres(movie, fixedNow)).toBe(false);
    });

    it("returns false if streaming is already available", () => {
      const movie = {
        media_type: "movie" as const,
        release_date: "2026-11-10",
        providers: [
          {
            name: "Prime Video",
            logo: "/prime.jpg",
            type: "flatrate" as const,
          },
        ],
      };
      expect(isInTheatres(movie, fixedNow)).toBe(false);
    });

    it("returns false for TV series", () => {
      const tvShow = {
        media_type: "tv" as const,
        release_date: "2026-11-10",
        providers: [],
      };
      expect(isInTheatres(tvShow, fixedNow)).toBe(false);
    });
  });

  describe("releaseYear and displayRating", () => {
    it("extracts year properly", () => {
      expect(releaseYear({ release_date: "2026-12-18" })).toBe("2026");
      expect(releaseYear({ release_date: "" })).toBe("N/A");
    });

    it("filters out N/A rating values", () => {
      expect(displayRating("8.5")).toBe("8.5");
      expect(displayRating("N/A")).toBe(null);
      expect(displayRating(null)).toBe(null);
      expect(displayRating(undefined)).toBe(null);
    });
  });

  describe("formatRuntime and formatSeasons", () => {
    it("formats minutes into hours and minutes correctly", () => {
      expect(formatRuntime(135)).toBe("2h 15m");
      expect(formatRuntime(120)).toBe("2h");
      expect(formatRuntime(45)).toBe("45m");
      expect(formatRuntime(0)).toBe(null);
      expect(formatRuntime(-10)).toBe(null);
      expect(formatRuntime(null)).toBe(null);
      expect(formatRuntime(undefined)).toBe(null);
    });

    it("formats number of seasons correctly", () => {
      expect(formatSeasons(1)).toBe("1 Season");
      expect(formatSeasons(3)).toBe("3 Seasons");
      expect(formatSeasons(0)).toBe(null);
      expect(formatSeasons(-1)).toBe(null);
      expect(formatSeasons(null)).toBe(null);
      expect(formatSeasons(undefined)).toBe(null);
    });
  });

  describe("sanitizeMedia", () => {
    it("normalises media fields properly", () => {
      const raw = {
        id: 12345,
        title: "Avengers: Doomsday",
        release_date: "2026-12-18",
        media_type: "movie",
        runtime: 150,
      };
      const sanitized = sanitizeMedia(raw);
      expect(sanitized).not.toBeNull();
      expect(sanitized?.id).toBe(12345);
      expect(sanitized?.title).toBe("Avengers: Doomsday");
      expect(sanitized?.release_date).toBe("2026-12-18");
      expect(sanitized?.media_type).toBe("movie");
      expect(sanitized?.runtime).toBe(150);
      expect(sanitized?.number_of_seasons).toBe(null);
    });

    it("normalises TV series fields properly", () => {
      const raw = {
        id: 67890,
        name: "Stranger Things",
        first_air_date: "2016-07-15",
        media_type: "tv",
        number_of_seasons: 4,
      };
      const sanitized = sanitizeMedia(raw);
      expect(sanitized).not.toBeNull();
      expect(sanitized?.id).toBe(67890);
      expect(sanitized?.title).toBe("Stranger Things");
      expect(sanitized?.release_date).toBe("2016-07-15");
      expect(sanitized?.media_type).toBe("tv");
      expect(sanitized?.runtime).toBe(null);
      expect(sanitized?.number_of_seasons).toBe(4);
    });

    it("returns null for non-object or missing id", () => {
      expect(sanitizeMedia(null)).toBeNull();
      expect(sanitizeMedia({ title: "No ID" })).toBeNull();
    });
  });
});
