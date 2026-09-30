import express, { Router } from "express";
import {
  getTrendingAll,
  getTrendingIndian,
  getTrendingPlatform,
} from "../controllers/trendingController.js";
import {
  findMovies,
  getSimilar,
  getMediaById,
  getMediaDetails,
  getMediaExtras,
} from "../controllers/searchController.js";

const router: Router = express.Router();

// Trending Routes
router.get("/trending/all", getTrendingAll);
router.get("/trending/indian", getTrendingIndian);
router.get("/trending/platform/:platform", getTrendingPlatform);

// Media Routes
// A cacheable read used by the Next.js detail page. `POST /media-details`
// stays for the Vite frontend, which looks titles up by name as well as by id.
router.get("/media/:mediaType/:id", getMediaById);

// Search Routes
router.post("/find-movies", findMovies);
router.post("/get-similar", getSimilar);
router.post("/media-details", getMediaDetails);
router.post("/media-extras", getMediaExtras);

export default router;
